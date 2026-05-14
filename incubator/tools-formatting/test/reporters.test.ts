import { equal, ok, strictEqual, throws } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  getDefaultReporter,
  getDefaultReporterType,
  getReporter,
  isAzurePipelines,
  isGitHubActions,
} from "../src/reporters.ts";
import type { Reporter } from "../src/types.ts";

const savedEnv: Record<string, string | undefined> = {};
const envKeys = ["RNX_TARGET_REPORTER", "GITHUB_ACTIONS", "TF_BUILD"];

const customReporter: Reporter = {
  name: "custom",
  noColors: true,
  asciiOnly: true,
  formatMessage: (_severity, message) => message,
  formatFileMessage: (_severity, fileMessage) => fileMessage.message,
  formatGroup: (header, children) => [header, ...children].join("\n"),
};

describe("reporters", () => {
  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = savedEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe("getReporter", () => {
    it("resolves a built-in reporter name", () => {
      equal(getReporter("github").name, "github");
    });

    it("returns a custom reporter instance as-is", () => {
      strictEqual(getReporter(customReporter), customReporter);
    });

    it("uses the default reporter when undefined", () => {
      strictEqual(getReporter(undefined), getDefaultReporter());
    });

    it("throws for unknown reporter names", () => {
      throws(() => getReporter("unknown"), /Unknown reporter type: unknown/);
    });
  });

  describe("default reporter resolution", () => {
    it("uses RNX_TARGET_REPORTER when set", () => {
      process.env.RNX_TARGET_REPORTER = "azure";
      equal(getDefaultReporterType(), "azure");
    });

    it("detects GitHub Actions", () => {
      process.env.GITHUB_ACTIONS = "true";
      equal(getDefaultReporterType(), "github");
    });

    it("detects Azure Pipelines", () => {
      process.env.TF_BUILD = "True";
      equal(getDefaultReporterType(), "azure");
    });

    it("falls back to console", () => {
      equal(getDefaultReporterType(), "console");
    });

    it("returns a cached default reporter instance", () => {
      const first = getDefaultReporter();
      const second = getDefaultReporter();
      strictEqual(second, first);
      ok(["azure", "console", "file", "github"].includes(first.name));
    });
  });

  describe("CI detection", () => {
    it("detects GitHub Actions only when GITHUB_ACTIONS is true", () => {
      equal(isGitHubActions(), false);
      process.env.GITHUB_ACTIONS = "false";
      equal(isGitHubActions(), false);
      process.env.GITHUB_ACTIONS = "true";
      equal(isGitHubActions(), true);
    });

    it("detects Azure Pipelines only when TF_BUILD is True", () => {
      equal(isAzurePipelines(), false);
      process.env.TF_BUILD = "true";
      equal(isAzurePipelines(), false);
      process.env.TF_BUILD = "True";
      equal(isAzurePipelines(), true);
    });
  });
});
