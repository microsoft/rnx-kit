import fs from "fs";
import path from "path";

/**
 * A simple throttler that limits the number of concurrent operations.
 */
export class Throttler {
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

// create a throttler which will ensure that no more than 20 files are written at once, across all batches
const globalThrottler = new Throttler(100);

/**
 * A helper that groups a set of asynchronous file writes into a batch that can be waited on.
 *
 * This also uses a Throttler to limit the number of concurrent writes across all BatchWriters.
 */
export class BatchWriter {
  private next: number;
  private active: Record<number, Promise<void>>;
  private throttler: Throttler;
  private cwd: string;
  private dirs = new Set<string>();

  /**
   * @param throttler optional Throttler to use, primarily used for testing
   */
  constructor(wd: string, throttler?: Throttler) {
    this.next = 0;
    this.active = {};
    this.throttler = throttler || globalThrottler;
    this.cwd = wd;
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
    const fn = () => fs.promises.writeFile(filePath, content);
    this.active[current] = this.throttler.run(fn).then(() => {
      delete this.active[current];
    });
  }

  /**
   * Wait for all active writes to complete for this group of files
   */
  async finish() {
    await Promise.all(Object.values(this.active));
  }
}
