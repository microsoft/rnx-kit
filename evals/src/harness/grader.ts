import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import { makeCommandSync } from "@rnx-kit/tools-shell";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Maximum duration of a single grading call */
const GRADING_TIMEOUT_MS = 5 * 60 * 1000;

type ProviderOptions = {
  id?: string;
  config?: {
    /** Model to use; defaults to the Copilot runtime's default */
    model?: string;
  };
};

type CallApiOptions = {
  abortSignal?: AbortSignal;
};

function getToken(): string {
  const token =
    process.env["COPILOT_GITHUB_TOKEN"] ||
    process.env["GH_TOKEN"] ||
    process.env["GITHUB_TOKEN"];
  if (token) {
    return token;
  }

  const { stdout, status } = makeCommandSync("gh")("auth", "token");
  if (status !== 0 || !stdout) {
    throw new Error(
      "A GitHub token with Copilot access is required; set COPILOT_GITHUB_TOKEN or log in with 'gh auth login'"
    );
  }
  return stdout.trim();
}

type ChatMessage = {
  role: string;
  content: string;
};

function isChat(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.every(
      (m) => typeof m?.role === "string" && typeof m?.content === "string"
    )
  );
}

/**
 * Splits a grading prompt into a system message and a user prompt. promptfoo
 * sends `llm-rubric` prompts as a JSON-encoded chat.
 */
function toSessionPrompt(prompt: string): {
  system?: string;
  prompt: string;
} {
  let messages: unknown;
  try {
    messages = JSON.parse(prompt);
  } catch (_) {
    return { prompt };
  }
  if (!isChat(messages)) {
    return { prompt };
  }

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const user = messages
    .filter((m) => m.role !== "system")
    .map((m) => m.content)
    .join("\n\n");
  return { ...(system ? { system } : {}), prompt: user };
}

/**
 * promptfoo provider that grades `llm-rubric` assertions with Copilot, so that
 * a GitHub token with Copilot access is the only credential the evals need.
 * The session has no tools and no access to the repository.
 */
// oxlint-disable-next-line import/no-default-export
export default class CopilotGraderProvider {
  private readonly providerId: string;
  private readonly model: string | undefined;

  constructor({ id, config }: ProviderOptions = {}) {
    this.providerId = id ?? "copilot-grader";
    this.model = config?.model;
  }

  id(): string {
    return this.providerId;
  }

  async callApi(
    input: string,
    _context?: unknown,
    options?: CallApiOptions
  ): Promise<{ output: string } | { error: string }> {
    const { system, prompt } = toSessionPrompt(input);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rnx-kit-evals-"));
    const client = new CopilotClient({
      connection: RuntimeConnection.forStdio({
        env: { PATH: process.env["PATH"] ?? "", HOME: dir },
      }),
      baseDirectory: path.join(dir, "copilot"),
      workingDirectory: dir,
      logLevel: "error",
      useLoggedInUser: false,
    });

    const abort = () => void client.forceStop();
    options?.abortSignal?.addEventListener("abort", abort);
    try {
      const token = getToken();
      const session = await client.createSession({
        model: this.model,
        workingDirectory: dir,
        gitHubTokenProvider: () => ({
          kind: "token",
          accessToken: token,
          expiresIn: 8 * 60 * 60,
        }),
        availableTools: [],
        disabledMcpServers: ["github-mcp-server"],
        enableSkills: false,
        memory: { enabled: false },
        onPermissionRequest: () => ({
          kind: "reject",
          feedback: "Not allowed while grading",
        }),
        skipCustomInstructions: true,
        ...(system
          ? { systemMessage: { mode: "replace", content: system } }
          : {}),
      });

      const reply = await session.sendAndWait({ prompt }, GRADING_TIMEOUT_MS);
      await session.disconnect();

      const output = reply?.data.content;
      return output ? { output } : { error: "Grader returned no output" };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    } finally {
      options?.abortSignal?.removeEventListener("abort", abort);
      await client.stop();
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  }
}
