// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import assert from "node:assert";
import { describe, it } from "node:test";
import {
  classifyModelError,
  DEFAULT_COPILOT_MODELS,
  DEFAULT_COPILOT_REASONING_EFFORT,
  ModelChain,
  parseModelList,
} from "../src/modules/ai-model.ts";

const UNAVAILABLE = (m: string) =>
  `Error: Model "${m}" from --model flag is not available.`;
const NO_EFFORT = (m: string) =>
  `Error: Model "${m}" does not support reasoning effort configuration (requested: "low").`;

describe("classifyModelError", () => {
  it("recognizes Copilot CLI errors", () => {
    assert.strictEqual(
      classifyModelError(UNAVAILABLE("x")),
      "model-unavailable"
    );
    assert.strictEqual(
      classifyModelError(NO_EFFORT("auto")),
      "effort-unsupported"
    );
  });

  it("recognizes Claude Code model errors", () => {
    assert.strictEqual(
      classifyModelError(
        "There's an issue with the selected model (x). It may not exist or you may not have access to it."
      ),
      "model-unavailable"
    );
    assert.strictEqual(
      classifyModelError(
        'API Error: 404 {"type":"error","error":{"type":"not_found_error","message":"model: x"}}'
      ),
      "model-unavailable"
    );
  });

  it("ignores unrelated errors", () => {
    assert.strictEqual(classifyModelError("Process timed out"), undefined);
    assert.strictEqual(
      classifyModelError(
        "API Error: 400 Not a valid API key for this workspace"
      ),
      undefined
    );
  });
});

describe("parseModelList", () => {
  it("accepts strings, comma lists, arrays, and nothing", () => {
    assert.deepStrictEqual(parseModelList(undefined), []);
    assert.deepStrictEqual(parseModelList("auto"), ["auto"]);
    assert.deepStrictEqual(parseModelList(" a , ,b "), ["a", "b"]);
    assert.deepStrictEqual(parseModelList(["a", " ", "b"]), ["a", "b"]);
  });
});

describe("defaults", () => {
  it("default to Copilot's router with low effort", () => {
    assert.deepStrictEqual(DEFAULT_COPILOT_MODELS, ["auto"]);
    assert.strictEqual(DEFAULT_COPILOT_REASONING_EFFORT, "low");
  });
});

describe("ModelChain", () => {
  it("falls back through the list, then to the CLI default", () => {
    const warnings: string[] = [];
    const chain = new ModelChain(["old-1", "new-2"], undefined, (m) =>
      warnings.push(m)
    );
    assert.deepStrictEqual(chain.current, {
      model: "old-1",
      reasoningEffort: undefined,
    });

    assert.strictEqual(
      chain.handleFailure(chain.current, UNAVAILABLE("old-1")),
      true
    );
    assert.strictEqual(chain.current.model, "new-2");
    assert.match(warnings[0], /old-1 is not available; falling back to new-2/);

    assert.strictEqual(
      chain.handleFailure(chain.current, UNAVAILABLE("new-2")),
      true
    );
    assert.strictEqual(chain.current.model, undefined);
    assert.match(warnings[1], /CLI's default model/);

    // The CLI default cannot fall back further
    assert.strictEqual(
      chain.handleFailure(chain.current, UNAVAILABLE("default")),
      false
    );
  });

  it("advances once when concurrent calls fail on the same model", () => {
    const warnings: string[] = [];
    const chain = new ModelChain(["a", "b", "c"], undefined, (m) =>
      warnings.push(m)
    );
    const first = chain.current;
    const second = chain.current;
    assert.strictEqual(chain.handleFailure(first, UNAVAILABLE("a")), true);
    assert.strictEqual(chain.handleFailure(second, UNAVAILABLE("a")), true);
    assert.strictEqual(chain.current.model, "b");
    assert.strictEqual(warnings.length, 1);
  });

  it("drops reasoning effort only for models that reject it", () => {
    const warnings: string[] = [];
    const chain = new ModelChain(["auto", "luna"], "low", (m) =>
      warnings.push(m)
    );
    assert.deepStrictEqual(chain.current, {
      model: "auto",
      reasoningEffort: "low",
    });

    assert.strictEqual(
      chain.handleFailure(chain.current, NO_EFFORT("auto")),
      true
    );
    assert.deepStrictEqual(chain.current, {
      model: "auto",
      reasoningEffort: undefined,
    });
    assert.strictEqual(warnings.length, 1);

    assert.strictEqual(
      chain.handleFailure(chain.current, UNAVAILABLE("auto")),
      true
    );
    assert.deepStrictEqual(chain.current, {
      model: "luna",
      reasoningEffort: "low",
    });
  });

  it("does not retry on unrelated failures", () => {
    const chain = new ModelChain(["a"], "low");
    assert.strictEqual(
      chain.handleFailure(chain.current, "Process timed out"),
      false
    );
    assert.strictEqual(chain.current.model, "a");
  });

  it("does not loop when an effort error comes without effort", () => {
    const chain = new ModelChain(["a"]);
    assert.strictEqual(
      chain.handleFailure(chain.current, NO_EFFORT("a")),
      false
    );
  });
});
