export type Message = {
  type: "message";
  role: "user" | "assistant";
  content: string;
};

export type ToolCall = {
  type: "tool";
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  success?: boolean;
  result?: string;
};

export type FileWrite = {
  path: string;
  /** Text that was added; for edits, only the replacement text. */
  content: string;
};

/**
 * Agent-agnostic representation of a session. Adapters convert agent-specific
 * logs into this shape.
 */
export type Transcript = {
  agent: string;
  /** Messages and tool calls in chronological order. */
  entries: (Message | ToolCall)[];
  /** Shell commands run by the agent. */
  commands: string[];
  /** Files read by the agent, relative to the repository root if possible. */
  filesRead: string[];
  /** Files created or edited by the agent's file editing tools. */
  filesWritten: FileWrite[];
};

export type Adapter = (log: string) => Transcript;

// The types below mirror promptfoo's so that evals can be migrated if needed:
// https://www.promptfoo.dev/docs/configuration/reference/

export type ProviderResponse = {
  /** The agent's final message. */
  output: string;
  metadata: {
    transcript: Transcript;
    /** Unified diff of the changes made during the session, if available. */
    diff?: string;
  };
};

export type GradingResult = {
  pass: boolean;
  score: number;
  reason: string;
  componentResults?: GradingResult[];
};

export type AssertionContext = {
  providerResponse: ProviderResponse;
};

export type Assertion =
  | {
      type: "javascript";
      value: (
        output: string,
        context: AssertionContext
      ) => GradingResult | Promise<GradingResult>;
    }
  | {
      type: "llm-rubric";
      value: string;
    };

export type TestCase = {
  description: string;
  assert: Assertion[];
  metadata?: {
    /**
     * Whether the eval grades all sessions. By default, an eval only grades
     * logs with a folder named after the eval in their path, e.g.
     * `logs/changeset-required/session.jsonl`.
     */
    allSessions?: boolean;
    /** Fraction of logs that must pass (default: 0.8). */
    passRate?: number;
  };
};
