import { parsePatch, repoPath } from "../assertions.ts";
import type { FileWrite, Message, ToolCall, Transcript } from "../types.ts";

type Event = {
  type: string;
  data: Record<string, unknown>;
};

const SHELL_TOOLS = ["bash", "powershell"];

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Converts a Copilot CLI session log
 * (`~/.copilot/session-state/<id>/events.jsonl`) into a transcript.
 */
export function copilot(log: string, source = "session log"): Transcript {
  const transcript: Transcript = {
    agent: "copilot",
    entries: [],
    commands: [],
    filesRead: [],
    filesWritten: [],
  };

  // Paths outside the repository root are kept as is
  const relative = (p: string) => repoPath(p, transcript.root) ?? p;
  const addWrite = (write: FileWrite) => {
    const p = repoPath(write.path, transcript.root);
    if (p) {
      transcript.filesWritten.push({ ...write, path: p });
    }
  };

  const calls = new Map<string, ToolCall>();

  const lines = log.split("\n");
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (!line.trim()) {
      continue;
    }

    let event: Partial<Event> | null = null;
    try {
      event = JSON.parse(line);
    } catch {
      // The log may be truncated, e.g. if the session crashed
    }
    if (typeof event?.type !== "string") {
      console.warn(`Skipped malformed line ${i + 1} in ${source}`);
      continue;
    }

    const { type } = event;
    const data = (event.data ?? {}) as Record<string, unknown>;
    switch (type) {
      case "session.start":
      case "session.resume": {
        const context = data.context as Record<string, unknown> | undefined;
        transcript.root =
          str(context?.gitRoot) ?? str(context?.cwd) ?? transcript.root;
        break;
      }

      case "user.message":
      case "assistant.message": {
        const content = str(data.content);
        if (content) {
          const role = type === "user.message" ? "user" : "assistant";
          transcript.entries.push({
            type: "message",
            role,
            content,
          } as Message);
        }
        break;
      }

      case "tool.execution_start": {
        const id = String(data.toolCallId);
        const name = String(data.toolName);
        const args = (data.arguments ?? {}) as Record<string, unknown>;
        const call: ToolCall = { type: "tool", id, name, arguments: args };
        calls.set(id, call);
        transcript.entries.push(call);

        const filePath = str(args.path);
        if (SHELL_TOOLS.includes(name)) {
          const command = str(args.command);
          if (command) {
            transcript.commands.push(command);
          }
        } else if (name === "view" && filePath) {
          transcript.filesRead.push(relative(filePath));
        } else if (name === "apply_patch") {
          const input = str(args.input) ?? str(args.patch) ?? "";
          for (const write of parsePatch(input)) {
            addWrite(write);
          }
        } else if (filePath) {
          const content = str(args.file_text) ?? str(args.new_str);
          if (content !== undefined) {
            addWrite({ path: filePath, content });
          }
        }
        break;
      }

      case "tool.execution_complete": {
        const call = calls.get(String(data.toolCallId));
        if (call) {
          const result = data.result as Record<string, unknown> | undefined;
          const error = data.error as Record<string, unknown> | undefined;
          call.success = data.success === true;
          call.result = str(result?.content) ?? str(error?.message);
        }
        break;
      }
    }
  }

  return transcript;
}
