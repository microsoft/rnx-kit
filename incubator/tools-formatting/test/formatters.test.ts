import { equal, ok, strictEqual, throws } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  FormatterRegistry,
  createFormatter,
  getDefaultFormatter,
  getDefaultFormatterType,
  getFormatter,
  getFormatterRegistry,
  isAzurePipelines,
  isGitHubActions,
  setFormatterRegistry,
} from "../src/formatters.ts";
import type { Formatter, FormatterPropOverrides } from "../src/types.ts";

const savedEnv: Record<string, string | undefined> = {};
const envKeys = ["RNX_TARGET_FORMATTER", "GITHUB_ACTIONS", "TF_BUILD"];

const customFormatter: Formatter = {
  name: "custom",
  noColors: true,
  asciiOnly: true,
  formatMessage: (_severity, message) => message,
  formatFileMessage: (_severity, fileMessage) => fileMessage.message,
  formatGroup: (header, children) => [header, ...children].join("\n"),
};

describe("formatters", () => {
  beforeEach(() => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    // Drop any cached singleton so env changes are observed by each test
    setFormatterRegistry(undefined);
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
    setFormatterRegistry(undefined);
  });

  describe("getFormatter", () => {
    it("resolves a built-in formatter name", () => {
      equal(getFormatter("github").name, "github");
    });

    it("returns a custom formatter instance as-is", () => {
      strictEqual(getFormatter(customFormatter), customFormatter);
    });

    it("uses the default formatter when undefined", () => {
      strictEqual(getFormatter(undefined), getDefaultFormatter());
    });

    it("throws for unknown formatter names", () => {
      throws(() => getFormatter("unknown"), /Unknown formatter type: unknown/);
    });

    it("caches built-in lookups so repeated calls return the same instance", () => {
      strictEqual(getFormatter("github"), getFormatter("github"));
    });
  });

  describe("default formatter resolution", () => {
    it("uses RNX_TARGET_FORMATTER when set", () => {
      process.env.RNX_TARGET_FORMATTER = "azure";
      equal(getDefaultFormatterType(), "azure");
    });

    it("detects GitHub Actions", () => {
      process.env.GITHUB_ACTIONS = "true";
      equal(getDefaultFormatterType(), "github");
    });

    it("detects Azure Pipelines", () => {
      process.env.TF_BUILD = "True";
      equal(getDefaultFormatterType(), "azure");
    });

    it("falls back to console", () => {
      equal(getDefaultFormatterType(), "console");
    });

    it("returns a cached default formatter instance", () => {
      const first = getDefaultFormatter();
      const second = getDefaultFormatter();
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

  describe("createFormatter", () => {
    it("creates a fresh instance each call (no cache)", () => {
      const a = createFormatter("console");
      const b = createFormatter("console");
      ok(a !== b);
    });

    it("applies property overrides", () => {
      const r = createFormatter("console", {
        name: "verbose",
        noColors: true,
      });
      equal(r.name, "verbose");
      equal(r.noColors, true);
    });

    it("throws for unknown built-in names", () => {
      throws(
        () => createFormatter("missing"),
        /Unknown formatter type: missing/
      );
    });
  });

  describe("FormatterRegistry", () => {
    it("can be instantiated and used directly without affecting the singleton", () => {
      const local = new FormatterRegistry();
      const singletonGH = getFormatter("github");
      const localGH = local.getFormatter("github");
      // Both are valid github formatters, but they come from different caches
      equal(localGH.name, "github");
      equal(singletonGH.name, "github");
    });

    it("reset() clears cached default and named formatters", () => {
      const r = new FormatterRegistry();
      const a = r.getFormatter("github");
      const cached = r.getFormatter("github");
      strictEqual(cached, a);
      r.reset();
      const b = r.getFormatter("github");
      ok(a !== b, "formatter cache should be cleared after reset");
    });

    it("supports subclassing to register additional formatter types", () => {
      const tcFormatter: Formatter = {
        name: "teamcity",
        noColors: true,
        asciiOnly: true,
        formatMessage: (sev, msg) =>
          `##teamcity[message text='${msg}' status='${sev.toUpperCase()}']`,
        formatFileMessage: (_sev, m) => m.message,
        formatGroup: (h, children) => [h, ...children].join("\n"),
      };

      class CustomRegistry extends FormatterRegistry {
        override createFormatter(
          type: string,
          options?: FormatterPropOverrides
        ): Formatter {
          if (type === "teamcity") return tcFormatter;
          return super.createFormatter(type, options);
        }
      }

      const reg = new CustomRegistry();
      strictEqual(reg.getFormatter("teamcity"), tcFormatter);
      // Built-ins still resolve through super
      equal(reg.getFormatter("github").name, "github");
    });

    it("supports subclassing to extend default-type resolution", () => {
      class GitLabAwareRegistry extends FormatterRegistry {
        override getDefaultFormatterType(): string {
          if (process.env.GITLAB_CI === "true") return "console"; // pretend mapping
          return super.getDefaultFormatterType();
        }
      }

      const reg = new GitLabAwareRegistry();
      process.env.GITHUB_ACTIONS = "true";
      equal(reg.getDefaultFormatterType(), "github");
      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = "true";
      try {
        equal(reg.getDefaultFormatterType(), "console");
      } finally {
        delete process.env.GITLAB_CI;
      }
    });

    it("respects a custom envKey override on a subclass", () => {
      class MyToolRegistry extends FormatterRegistry {
        protected override envKey = "MYTOOL_FORMATTER";
      }

      const reg = new MyToolRegistry();
      process.env.MYTOOL_FORMATTER = "azure";
      // Standard key is ignored
      process.env.RNX_TARGET_FORMATTER = "github";
      try {
        equal(reg.getDefaultFormatterType(), "azure");
      } finally {
        delete process.env.MYTOOL_FORMATTER;
      }
    });
  });

  describe("singleton management", () => {
    it("getFormatterRegistry lazily constructs a default instance", () => {
      setFormatterRegistry(undefined);
      const a = getFormatterRegistry();
      const b = getFormatterRegistry();
      strictEqual(a, b);
      ok(a instanceof FormatterRegistry);
    });

    it("setFormatterRegistry overrides the singleton used by top-level helpers", () => {
      const teamcityFormatter: Formatter = {
        name: "teamcity",
        noColors: true,
        asciiOnly: true,
        formatMessage: (_s, m) => `[tc] ${m}`,
        formatFileMessage: (_s, m) => m.message,
        formatGroup: (h, c) => [h, ...c].join("\n"),
      };

      class CustomRegistry extends FormatterRegistry {
        override createFormatter(
          type: string,
          options?: FormatterPropOverrides
        ): Formatter {
          if (type === "teamcity") return teamcityFormatter;
          return super.createFormatter(type, options);
        }
      }

      const custom = new CustomRegistry();
      setFormatterRegistry(custom);
      strictEqual(getFormatterRegistry(), custom);
      strictEqual(getFormatter("teamcity"), teamcityFormatter);
    });

    it("setFormatterRegistry(undefined) restores a freshly-constructed default", () => {
      const custom = new FormatterRegistry();
      setFormatterRegistry(custom);
      strictEqual(getFormatterRegistry(), custom);
      setFormatterRegistry(undefined);
      const next = getFormatterRegistry();
      ok(next !== custom, "a new default instance should be created");
    });
  });
});
