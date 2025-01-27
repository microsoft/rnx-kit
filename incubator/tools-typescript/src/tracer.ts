type TimerEntry = { count: number; time: number };

export class Tracer {
  private logging: boolean;
  private tracing: boolean;

  private startTime = performance.now();
  private name: string;

  private timers: Record<string, TimerEntry> = {};

  constructor(name: string, log: boolean, trace: boolean) {
    this.name = name;
    this.logging = log;
    this.tracing = trace;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(...args: any[]) {
    if (this.logging) {
      console.log(`${this.name}: `, ...args);
    }
  }

  time(category: string, fn: () => void): void {
    const start = performance.now();
    fn();
    if (this.tracing) {
      this.finishTimer(category, performance.now() - start);
    }
  }

  async timeAsync(
    category: string,
    fn: () => Promise<void | void[]>
  ): Promise<void> {
    const start = performance.now();
    await fn();
    if (this.tracing) {
      this.finishTimer(category, performance.now() - start);
    }
  }

  finish(): void {
    for (const category in this.timers) {
      const { count, time } = this.timers[category];
      const categoryName = category.padEnd(20);
      console.log(
        `${this.name}: ${categoryName}: Time: ${time.toFixed(2)}ms Calls: ${count}`
      );
    }
    this.log(
      `Finished build (${(performance.now() - this.startTime).toFixed(2)}ms)`
    );
  }

  private ensureTimerEntry(category: string): TimerEntry {
    this.timers[category] = this.timers[category] || { count: 0, time: 0 };
    return this.timers[category];
  }

  private finishTimer(category: string, time: number): void {
    const entry = this.ensureTimerEntry(category);
    entry.count++;
    entry.time += time;
  }
}
