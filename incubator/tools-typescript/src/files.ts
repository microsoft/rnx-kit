import { EventEmitter, once } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { AsyncThrottler, AsyncWriter, Reporter } from "./types";

/**
 * A simple throttler that limits the number of concurrent operations.
 */
class Throttler implements AsyncThrottler {
  private first = 0;
  private pending: (() => Promise<void>)[] = [];

  private active = 0;
  private maxActive: number;
  private rebalanceAt: number;

  /**
   * @param maxActive max number of concurrent operations to run at once
   * @param rebalanceAt the queue is implemented using an array with first/last. This is the offset point where the array should be shifted back to 0.
   */
  constructor(maxActive: number, rebalanceAt = 1000) {
    this.maxActive = maxActive;
    this.rebalanceAt = rebalanceAt;
  }

  // function to call when an async operation finishes, captures this for passing to .finally
  private onFinished = () => this.runFinished();

  /**
   * Run the given function, immediately if we have space, otherwise queue it and run it when the queue clears
   * @param fn function that returns a promise
   * @returns a promise that resolves when the function has been run and completed
   */
  run(fn: () => Promise<void>): Promise<void> {
    if (this.active < this.maxActive) {
      // if below the active threshold run the function immediately
      this.active++;
      return fn().finally(this.onFinished);
    } else {
      // otherwise wrap it in a promise that will run when the queue clears
      return new Promise((resolve, reject) => {
        this.addPending(() =>
          fn().finally(this.onFinished).then(resolve, reject)
        );
      });
    }
  }

  private async runFinished() {
    this.active--;
    return this.processNextPending();
  }

  private addPending(p: () => Promise<void>) {
    this.pending.push(p);
  }

  private async processNextPending() {
    this.rebalanceQueue();
    if (this.first < this.pending.length) {
      const next = this.pending[this.first++];
      this.active++;
      return next();
    }
    return Promise.resolve();
  }

  /** shift the queue to start at 0 again, just hygiene so it doesn't grow unbounded */
  private rebalanceQueue() {
    if (this.first > this.rebalanceAt) {
      this.pending = this.pending.copyWithin(0, this.first);
      this.pending.length -= this.first;
      this.first = 0;
    }
  }
}

/**
 * Creates an AsyncThrottler that can be used to limit the number of concurrent operations that
 * happen at any given time.
 *
 * @param maxActive max number of concurrent operations to run at once
 * @param rebalanceAt the queue is implemented using an array with first/last. This is the offset point where the array should be shifted back to 0.
 * @returns an AsyncThrottler implementation
 */
export function createAsyncThrottler(
  maxActive: number,
  rebalanceAt?: number
): AsyncThrottler {
  return new Throttler(maxActive, rebalanceAt);
}

// create a throttler which will ensure that no more than 40 files are written at once, across all batches
const globalThrottler = createAsyncThrottler(40);

/**
 * A helper that groups a set of asynchronous file writes into a batch that can be waited on.
 *
 * This also uses a Throttler to limit the number of concurrent writes across all BatchWriters.
 */
class BatchWriter implements AsyncWriter {
  private errors: Error[] = [];
  private queued = 0;
  private written = 0;
  private throttler: AsyncThrottler;
  private cwd: string;
  private dirs = new Set<string>();
  private reporter: Reporter | undefined;
  private emitter = new EventEmitter();
  static mkdirOptions = { recursive: true, mode: 0o755 };

  /**
   * @param throttler optional Throttler to use, primarily used for testing
   */
  constructor(wd: string, throttler?: AsyncThrottler, reporter?: Reporter) {
    this.throttler = throttler || globalThrottler;
    this.cwd = wd;
    this.reporter = reporter;
  }

  /**
   * Single instance for each writer so a new function isn't created on each file write
   */
  private writeFinished = () => {
    this.written++;
    if (this.queued === this.written) {
      // send done, will go into the ether if no listeners are attached
      this.emitter.emit("done");
    }
  };

  /**
   * Write a file asynchronously, adding it to the batch
   * @param name file name
   * @param content file content
   */
  writeFile(name: string, content: string) {
    const filePath = path.isAbsolute(name) ? name : path.join(this.cwd, name);
    const dir = path.dirname(filePath);
    if (!this.dirs.has(dir)) {
      fs.mkdirSync(dir, BatchWriter.mkdirOptions);
      this.dirs.add(dir);
    }
    this.queued++;
    const fn = () =>
      fs.promises.writeFile(filePath, content).catch((e) => {
        this.reporter?.error(`Error writing ${filePath}`, e);
        this.errors.push(e);
      });
    this.throttler.run(fn).then(this.writeFinished);
  }

  /**
   * Clear the state of the writer, allows reuse after finish
   */
  private initializeState() {
    this.queued = 0;
    this.written = 0;
    this.errors = [];
  }

  /**
   * Wait for all active writes to complete for this group of files
   */
  async finish() {
    // we will finish things up on the done event
    const onFinish = once(this.emitter, "done").then(() => {
      const { errors, written } = this;
      this.initializeState();

      if (errors.length > 0) {
        this.reporter?.error(`Errors writing ${errors.length} files`);
        return Promise.reject(errors.length > 1 ? errors : errors[0]);
      } else {
        this.reporter?.log(`Finished writing ${written} files`);
        return Promise.resolve();
      }
    });

    // if the queue never started write emit the done event so that we don't wait forever
    if (this.queued === 0) {
      this.emitter.emit("done");
    }
    // now wait on the done event
    await onFinish;
  }
}

/**
 * Create an AsyncWriter that can be used to write files asynchronously and wait on the results
 *
 * @param root root path for the files when they are relative
 * @param throttler optional throttler to link multiple writers together
 * @param reporter optional reporter to report output
 * @returns an AsyncWriter implementation
 */
export function createAsyncWriter(
  root: string,
  throttler?: AsyncThrottler,
  reporter?: Reporter
): AsyncWriter {
  return new BatchWriter(root, throttler, reporter);
}
