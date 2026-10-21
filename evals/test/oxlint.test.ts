import type { AgentChangedFile, AgentRun } from "@rnx-kit/agent-evals";
import { equal, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { passesOxlint } from "../src/oxlint.ts";

const FIXTURE = fileURLToPath(new URL("__fixtures__/oxlint", import.meta.url));

function fixture(file: string): AgentChangedFile {
  const content = fs.readFileSync(path.join(FIXTURE, file), "utf-8");
  return { path: file, status: "added", content };
}

function makeRun(files: AgentChangedFile[]): AgentRun {
  return {
    commands: [],
    toolCalls: [],
    files,
    diff: "",
    finalMessage: "",
    workdir: FIXTURE,
  };
}

describe("passesOxlint()", () => {
  const index = fixture("src/index.ts");
  const types = fixture("src/types.ts");

  it("passes if no files match", () => {
    const result = passesOxlint(makeRun([index]), {
      config: { files: "\\.md$", config: "oxlint/types-only.json" },
    });
    equal(result.pass, true);
    equal(result.reason, "No matching files changed");
  });

  it("passes if matching files pass", () => {
    const result = passesOxlint(makeRun([types]), {
      config: { files: "/types\\.ts$", config: "oxlint/types-only.json" },
    });
    equal(result.pass, true);
    equal(result.reason, "src/types.ts passed oxlint");
  });

  it("fails for each diagnostic", () => {
    const result = passesOxlint(makeRun([index, types]), {
      config: {
        files: "\\.ts$",
        config: "../../test/__fixtures__/oxlint-no-plusplus.json",
      },
    });
    equal(result.pass, false);
    equal(
      result.reason,
      "src/index.ts:3: eslint(no-plusplus): Unary operator '++' used."
    );
  });

  it("throws if oxlint cannot lint the files", () => {
    const missing: AgentChangedFile = {
      path: "src/missing.ts",
      status: "added",
      content: "",
    };
    throws(() =>
      passesOxlint(makeRun([missing]), {
        config: { files: "\\.ts$", config: "oxlint/types-only.json" },
      })
    );
  });

  it("throws if the config is invalid", () => {
    throws(() =>
      passesOxlint(makeRun([types]), {
        config: { files: "\\.ts$", config: "oxlint/missing.json" },
      })
    );
  });
});
