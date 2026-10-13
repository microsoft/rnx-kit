import * as path from "node:path";
import { removeAllRuns, removeRun } from "./checkout.ts";

/**
 * Subset of promptfoo's `afterEach` hook context.
 *
 * promptfoo: `HookContextMap["afterEach"]`
 * @see https://www.promptfoo.dev/docs/configuration/reference/#extension-hooks
 */
type AfterEachContext = {
  result?: { response?: { output?: { workdir?: unknown } } };
};

/**
 * Removes the run's checkout after promptfoo has run all assertions.
 */
export function afterEach(context: AfterEachContext): void {
  const workdir = context.result?.response?.output?.workdir;
  if (typeof workdir === "string") {
    removeRun(path.dirname(workdir));
  }
}

/**
 * Removes runs that `afterEach` skipped, e.g. after a timeout.
 */
export function afterAll(): void {
  removeAllRuns();
}
