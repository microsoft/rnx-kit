import { createTrace, nullTrace, nullFunction } from "./trace.ts";
import type { TraceRecorder } from "./trace.ts";
import type {
  EventFrequency,
  PerfDomainOptions,
  TraceFunction,
  TraceStrategy,
} from "./types.ts";

/**
 * A class that tracks a set of perf options from a single domain. The domain can run in either timing mode
 * or node performance mark mode. The mode is determined by the presence of a recordTime function in the options.
 */
export class PerfDomain {
  private static FREQUENCY_RANK: Record<EventFrequency, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };
  private static DEFAULT_FREQUENCY: EventFrequency = "medium";
  static frequencyEnabled(test?: EventFrequency, setting?: EventFrequency) {
    const testFreq = test ?? PerfDomain.DEFAULT_FREQUENCY;
    const settingFreq = setting ?? PerfDomain.DEFAULT_FREQUENCY;
    return (
      PerfDomain.FREQUENCY_RANK[testFreq] <=
      PerfDomain.FREQUENCY_RANK[settingFreq]
    );
  }

  /** The name of the performance domain */
  readonly name: string;
  /** The tracing strategy used by this domain */
  readonly strategy: TraceStrategy;
  /** The frequency level of events for this domain, can be changed on the fly */
  frequency: EventFrequency;

  /**
   * Is this frequency of event enabled. Used for conditional setup of extra instrumentation.
   * @param frequency the event level to check frequency for
   */
  enabled(requested?: EventFrequency) {
    return PerfDomain.frequencyEnabled(requested, this.frequency);
  }

  /**
   * Get a trace function for this namespace and frequency. If this level of tracing is not enabled this will return
   * a non-tracking passthrough function.
   * @param frequency the frequency of the trace events. Defaults to "medium"
   * @returns a trace function that will record events for this namespace and frequency.
   */
  getTrace(requested?: EventFrequency): TraceFunction {
    return this.enabled(requested) ? this.trace : nullTrace;
  }

  /**
   * Create a wrapper around an event to be able to manually start and stop the timing/marking.
   * @param tag The tag for the event
   * @returns A function that stops the event when called
   */
  startEvent(tag: string, frequency?: EventFrequency): () => void {
    if (!this.enabled(frequency)) {
      return nullFunction;
    }
    const startVal = this.record(tag);
    return () => {
      this.record(tag, startVal);
    };
  }

  /**
   * Start performance tracking for this namespace. This will be called automatically on creation unless
   * the waitOnStart option is set. Trace events will still work without this but you won't get a boundary
   * around the events.
   */
  start() {
    this.startVal ??= this.record("");
  }

  /**
   * End event for the performance namespace. This will finish the start events and do some cleanup. If running
   * with the node strategy the marks for this namespace will be cleared.
   * @param processExit is this happening as part of process exit.
   */
  stop(processExit = false) {
    // first attempt to close the initial start event if it exists
    if (this.startVal != null) {
      const lastOp = this.lastTime;
      if (this.strategy === "timing" && processExit && lastOp !== undefined) {
        // in this case use the last recorded time as the end time for the domain
        const duration = lastOp - (this.startVal as number);
        this.recordTime(this.coerceTag(""), duration);
      } else {
        // otherwise just record the domain event with the start value as the handoff
        this.record("", this.startVal);
      }
      this.startVal = undefined;
    }

    // clear any orphaned marks, generally coming from exceptions that prevented normal cleanup
    if (!processExit) {
      this.cleanupMarks();
    }
  }

  /**
   * Constructor for a performance domain. If no options are provided this will be:
   * - medium frequency
   * - using node performance marks
   * - not wait on start (start will be called immediately)
   * @param name The name of the performance domain
   * @param options Options for configuring the performance domain
   */
  constructor(name: string, options: PerfDomainOptions = {}) {
    this.name = name;
    const {
      frequency = PerfDomain.DEFAULT_FREQUENCY,
      waitOnStart,
      recordTime,
    } = options;
    this.frequency = frequency;
    this.strategy = recordTime ? "timing" : "node";
    this.recordTime = recordTime ?? nullFunction;
    this.record = recordTime
      ? this.timingRecorder.bind(this)
      : this.markingRecorder.bind(this);
    this.trace = createTrace(this.record);
    if (!waitOnStart) {
      this.start();
    }
  }

  private tagMap: Record<string, string> = {};
  private firstTime?: number;
  private lastTime?: number;
  private sequence = 0;
  private startVal: number | string | undefined = undefined;
  private recordTime: (tag: string, duration?: number) => void;
  private record: TraceRecorder;
  private trace: TraceFunction;

  private coerceTag(tag: string) {
    return (this.tagMap[tag] ??= `${this.name}:${tag}`);
  }

  private timingRecorder(tag: string, startTime?: number) {
    const timeNow = performance.now();
    tag = this.coerceTag(tag);
    if (startTime == null) {
      this.recordTime(tag);
      this.firstTime ??= timeNow;
    } else {
      this.recordTime(tag, timeNow - startTime);
      this.lastTime = timeNow;
    }
    return timeNow;
  }

  private markingRecorder(tag: string, startMark?: string) {
    tag = this.coerceTag(tag);
    if (startMark == null) {
      const markerName = `${tag}:mark:${this.sequence++}`;
      performance.mark(markerName);
      return markerName;
    } else {
      const endMarkerName = `${startMark}:end`;
      performance.mark(endMarkerName);
      performance.measure(tag, startMark, endMarkerName);
      performance.clearMarks(startMark);
      performance.clearMarks(endMarkerName);
      performance.clearMeasures(tag);
      return tag;
    }
  }

  private cleanupMarks() {
    if (this.strategy === "node") {
      const prefix = `${this.name}:`;
      // clear marks for this namespace with the assumption there has been enough time to capture the measures.
      for (const entry of performance.getEntriesByType("mark")) {
        if (entry.name.startsWith(prefix)) {
          performance.clearMarks(entry.name);
        }
      }
    }
  }
}
