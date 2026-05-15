import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getEnvSettings,
  initResult,
  type BundleOptions,
  type BundleResult,
} from "./options.mts";

export type RunBundleResult = BundleResult & {
  /** Wall time from spawn to subprocess exit, in milliseconds. */
  wallMs: number;
  /** Subprocess exit code. */
  exitCode: number | null;
  /** Captured stderr (if any) from the subprocess. */
  stderr?: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_WORKER = path.join(__dirname, "bundle.mjs");

/**
 * Run the bundle worker in a fresh Node subprocess.
 *
 * - Spawns `node --experimental-strip-types --disable-warning=ExperimentalWarning bundle.mjs`
 *   so heap and module-load costs are isolated from the parent.
 * - Passes the resolved options via the ENV_OPTIONS environment variable.
 * - Captures the structured JSON output line from stdout.
 *
 * Resolves (never rejects) with a RunBundleResult; subprocess failures are
 * surfaced as `success: false` with the captured stderr.
 */
export function runBundle(options?: BundleOptions): Promise<RunBundleResult> {
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...getEnvSettings(options),
    };

    const args = [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      BUNDLE_WORKER,
    ];

    const start = performance.now();
    const child = spawn(process.execPath, args, {
      cwd: __dirname,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString("utf8");
    });
    child.stderr.on("data", (c: Buffer) => {
      stderr += c.toString("utf8");
    });

    const fail = (error: BundleResult["error"]): RunBundleResult => ({
      ...initResult(),
      error,
      wallMs: performance.now() - start,
      exitCode: child.exitCode,
      stderr,
    });

    child.on("error", (err) => {
      resolve(fail({ name: err.name, message: err.message, stack: err.stack }));
    });

    child.on("close", (code) => {
      const wallMs = performance.now() - start;
      // The worker writes a single JSON object on stdout, but stderr/stdout
      // ordering plus Metro's own logging means we may need to grab the last
      // valid JSON line.
      const lines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{") && l.endsWith("}"));
      const jsonLine = lines[lines.length - 1];
      if (!jsonLine) {
        return resolve(
          fail({
            name: "BundleWorkerError",
            message: `bundle worker emitted no JSON result (exit ${code})`,
            stack: stderr,
          })
        );
      }
      try {
        const parsed = JSON.parse(jsonLine) as BundleResult;
        resolve({
          ...parsed,
          wallMs,
          exitCode: code,
          stderr: stderr || undefined,
        });
      } catch (err) {
        resolve(
          fail({
            name: "BundleResultParseError",
            message: (err as Error).message,
            stack: stderr,
          })
        );
      }
    });
  });
}
