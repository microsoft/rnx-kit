// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * AI model selection with fallback for ai-merge.
 *
 * Model IDs come and go. A configured model that has been retired makes every
 * AI call fail, so ai-merge accepts an ordered preference list and moves to
 * the next entry when the CLI reports that a model is not available. When all
 * listed models are unavailable, it falls back to the CLI's own default model.
 * A reasoning-effort setting is dropped for models that reject it (e.g. the
 * Copilot `auto` router).
 *
 * This module provides:
 * - **ModelChain**: Current model/effort selection, advanced on failures
 * - **classifyModelError**: Recognize "model not available" and
 *   "reasoning effort not supported" CLI errors
 * - **parseModelList**: Normalize a config/CLI model value into a list
 * - **DEFAULT_COPILOT_MODELS** / **DEFAULT_COPILOT_REASONING_EFFORT**:
 *   Defaults used when the Copilot provider has no model configured
 *
 * @example
 * ```typescript
 * const chain = new ModelChain(["gpt-6-luna", "auto"], "low", warn);
 * for (;;) {
 *   const { model, reasoningEffort } = chain.current;
 *   const result = await invoke({ model, reasoningEffort });
 *   if (result.success || !chain.handleFailure({ model, reasoningEffort }, result.error ?? "")) {
 *     return result;
 *   }
 * }
 * ```
 *
 * @module ai-model
 */

/**
 * Copilot models used when none is configured. `auto` lets Copilot route each
 * request (shown as "Fusion" in the VS Code model picker); it never goes stale.
 */
export const DEFAULT_COPILOT_MODELS = ["auto"];

/** Reasoning effort used with Copilot when none is configured. */
export const DEFAULT_COPILOT_REASONING_EFFORT = "low";

/** Why an AI call failed, as far as model selection is concerned. */
export type ModelFailure = "model-unavailable" | "effort-unsupported";

/** Model and reasoning effort for one AI call (undefined = CLI default). */
export interface ModelSelection {
  model?: string;
  reasoningEffort?: string;
}

/**
 * Classify a CLI error message. Recognizes:
 * - Copilot: `Model "x" from --model flag is not available.`
 * - Copilot: `Model "x" does not support reasoning effort configuration`
 * - Claude Code: `There's an issue with the selected model (x). It may not
 *   exist or you may not have access to it.` and API `not_found_error`s
 */
export function classifyModelError(error: string): ModelFailure | undefined {
  if (/does not support reasoning effort/i.test(error)) {
    return "effort-unsupported";
  }
  if (
    /from --model flag is not available/i.test(error) ||
    /issue with the selected model/i.test(error) ||
    /not_found_error[^\n]*model/i.test(error)
  ) {
    return "model-unavailable";
  }
  return undefined;
}

/**
 * Normalize a model setting: a string (comma-separated allowed), a list, or
 * nothing. Blank entries are dropped.
 */
export function parseModelList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const items = Array.isArray(value) ? value : value.split(",");
  return items.map((m) => m.trim()).filter((m) => m.length > 0);
}

/**
 * Ordered model preference with fallback. Shared by concurrent AI calls: a
 * failure only advances the chain if it was reported for the current model,
 * so parallel failures of the same model advance it once.
 */
export class ModelChain {
  readonly models: string[];
  readonly reasoningEffort?: string;
  private index = 0;
  private readonly noEffort = new Set<string>();
  private readonly onWarn?: (message: string) => void;

  constructor(
    models: string[],
    reasoningEffort?: string,
    onWarn?: (message: string) => void
  ) {
    this.models = models;
    this.reasoningEffort = reasoningEffort;
    this.onWarn = onWarn;
  }

  /** Selection for the next call. Past the end of the list: CLI default. */
  get current(): ModelSelection {
    const model = this.models[this.index];
    const key = model ?? "";
    return {
      model,
      reasoningEffort:
        this.reasoningEffort && !this.noEffort.has(key)
          ? this.reasoningEffort
          : undefined,
    };
  }

  /**
   * Record a failed call made with `used`. Returns true when the selection
   * changed and the call should be retried with {@link current}.
   */
  handleFailure(used: ModelSelection, error: string): boolean {
    const failure = classifyModelError(error);
    if (!failure) return false;
    const key = used.model ?? "";

    if (failure === "effort-unsupported") {
      if (!used.reasoningEffort) return false;
      if (!this.noEffort.has(key)) {
        this.noEffort.add(key);
        this.onWarn?.(
          `Model ${used.model ?? "(CLI default)"} does not support reasoning effort; ` +
            `continuing without --reasoning-effort ${used.reasoningEffort}.`
        );
      }
      return true;
    }

    // Model unavailable. The CLI default cannot fall back any further.
    if (used.model === undefined) return false;
    if (this.models[this.index] === used.model) {
      this.index++;
      const next = this.models[this.index];
      this.onWarn?.(
        `Model ${used.model} is not available; ` +
          (next
            ? `falling back to ${next}.`
            : "falling back to the CLI's default model.") +
          ` Update aiMerge.model to a current model.`
      );
    }
    return true;
  }
}
