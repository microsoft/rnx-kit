import * as path from "node:path";
import { parsePatch } from "../assertions.ts";
import type { Message, ToolCall, Transcript } from "../types.ts";

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
export function copilot(log: string): Transcript {
  const transcript: Transcript = {
    agent: "copilot",
    entries: [],
    commands: [],
    filesRead: [],
    filesWritten: [],
  };

  let root = "";
  const relative = (p: string) => {
    if (root && path.isAbsolute(p)) {
      const rel = path.relative(root, p);
      if (!rel.startsWith("..")) {
        return rel.replaceAll("\\", "/");
      }
    }
    return p;
  };

  const calls: Record<string, ToolCall> = {};

  for (const line of log.split("\n")) {
    if (!line.trim()) {
      continue;
    }

    const { type, data } = JSON.parse(line) as Event;
    switch (type) {
      case "session.start":
      case "session.resume": {
        const context = data.context as Record<string, unknown> | undefined;
        root = str(context?.gitRoot) ?? str(context?.cwd) ?? root;
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
        calls[id] = call;
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
            transcript.filesWritten.push({
              ...write,
              path: relative(write.path),
            });
          }
        } else if (filePath) {
          const content = str(args.file_text) ?? str(args.new_str);
          if (content !== undefined) {
            transcript.filesWritten.push({ path: relative(filePath), content });
          }
        }
        break;
      }

      case "tool.execution_complete": {
        const call = calls[String(data.toolCallId)];
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
