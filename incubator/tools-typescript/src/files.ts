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

  /**
   * Run the given function, immediately if we have space, otherwise queue it and run it when the queue clears
   * @param fn function that returns a promise
   * @returns a promise that resolves when the function has been run and completed
   */
  run(fn: () => Promise<void>): Promise<void> {
    if (this.active < this.maxActive) {
      // if below the active threshold run the function immediately
      this.active++;
      return fn().finally(() => this.runFinished());
    } else {
      // otherwise wrap it in a promise that will run when the queue clears
      return new Promise((resolve, reject) => {
        this.addPending(() =>
          fn()
            .finally(() => this.runFinished())
            .then(resolve, reject)
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
  private next = 0;
  private errors: Error[] = [];
  private active: Record<number, Promise<void>> = {};
  private throttler: AsyncThrottler;
  private cwd: string;
  private dirs = new Set<string>();
  private reporter: Reporter | undefined;

  /**
   * @param throttler optional Throttler to use, primarily used for testing
   */
  constructor(wd: string, throttler?: AsyncThrottler, reporter?: Reporter) {
    this.throttler = throttler || globalThrottler;
    this.cwd = wd;
    this.reporter = reporter;
  }

  /**
   * Write a file asynchronously, adding it to the batch
   * @param name file name
   * @param content file content
   */
  writeFile(name: string, content: string) {
    const filePath = path.isAbsolute(name) ? name : path.join(this.cwd, name);
    const dir = path.dirname(filePath);
    if (!this.dirs.has(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      this.dirs.add(dir);
    }
    const current = this.next++;
    const fn = () =>
      fs.promises.writeFile(filePath, content).catch((e) => {
        this.reporter?.error(`Error writing ${filePath}`, e);
        this.errors.push(e);
      });
    this.active[current] = this.throttler.run(fn).then(() => {
      delete this.active[current];
    });
  }

  /**
   * Wait for all active writes to complete for this group of files
   */
  async finish() {
    await Promise.all(Object.values(this.active)).then(() => {
      if (this.errors.length > 0) {
        this.reporter?.error(`Errors writing ${this.errors.length} files`);
        return Promise.reject(
          this.errors.length > 1 ? this.errors : this.errors[0]
        );
      } else {
        this.reporter?.log(`Finished writing ${this.next} files`);
        return Promise.resolve();
      }
    });
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
