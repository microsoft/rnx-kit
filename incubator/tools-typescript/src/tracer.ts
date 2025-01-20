export class Tracer {
  private logEnabled: boolean;
  private traceEnabled: boolean;
  private name = "";

  constructor(log: boolean, trace: boolean) {
    this.logEnabled = log;
    this.traceEnabled = trace;
  }

  isLogging(): boolean {
    return this.logEnabled;
  }

  isTracing(): boolean {
    return this.traceEnabled;
  }

  setName(name: string): void {
    this.name = name;
  }

  log(message: string): void {
    if (this.logEnabled) {
      console.log(`${this.name}: ${message}`);
    }
  }

  time(category: string, fn: () => void): void {
    const start = performance.now();
    fn();
    if (this.traceEnabled) {
      this.finishTimer(category, performance.now() - start);
    }
  }

  async timeAsync(
    category: string,
    fn: () => Promise<void | void[]>
  ): Promise<void> {
    const start = performance.now();
    await fn();
    if (this.traceEnabled) {
      this.finishTimer(category, performance.now() - start);
    }
  }

  reportTimers(): void {
    for (const category in this.timers) {
      const { count, time } = this.timers[category];
      const categoryName = category.padEnd(20);
      console.log(
        `${this.name}: ${categoryName}: ${time.toFixed(2)}ms with ${count} calls`
      );
    }
  }

  private timers: Record<string, { count: number; time: number }> = {};

  private finishTimer(category: string, time: number): void {
    if (this.timers[category]) {
      this.timers[category].count++;
      this.timers[category].time += time;
    } else {
      this.timers[category] = { count: 1, time };
    }
  }
}
