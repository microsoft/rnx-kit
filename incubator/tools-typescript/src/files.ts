import fs from "node:fs";
import path from "node:path";
import type { AsyncThrottler, AsyncWriter, Reporter } from "./types";

/**
 * A simple throttler that limits the number of concurrent operations.
 */
class Throttler implements AsyncThrottler {
  private first = 0;
  private last = 0;
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
      this.active++;
      return fn().finally(() => this.runFinished());
    } else {
      return new Promise((resolve, reject) => {
        this.addPending(() =>
          fn()
            .finally(() => this.runFinished())
            .then(resolve, reject)
        );
      });
    }
  }

  private runFinished() {
    this.active--;
    this.processNextPending();
  }

  private addPending(p: () => Promise<void>) {
    this.pending[this.last++] = p;
  }

  private processNextPending() {
    this.rebalanceQueue();
    if (this.first < this.last) {
      const next = this.pending[this.first++];
      this.active++;
      next().then(() => this.runFinished());
    }
  }

  /** shift the queue to start at 0 again, just hygiene so it doesn't grow unbounded */
  private rebalanceQueue() {
    if (this.first > this.rebalanceAt) {
      this.pending = this.pending.slice(this.first);
      this.last -= this.first;
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
  private errors = 0;
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
        this.errors++;
      });
    this.active[current] = this.throttler.run(fn).then(() => {
      delete this.active[current];
    });
  }

  /**
   * Wait for all active writes to complete for this group of files
   */
  async finish() {
    await Promise.all(Object.values(this.active)).then(
      () => {
        this.reporter?.log(`Finished writing ${this.next} files`);
      },
      () => {
        this.reporter?.error(
          `Errors writing ${this.errors} out of ${this.next} files`
        );
      }
    );
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
