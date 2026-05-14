import { equal, ok, strictEqual, throws } from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  ReporterRegistry,
  createReporter,
  getDefaultReporter,
  getDefaultReporterType,
  getReporter,
  getReporterRegistry,
  isAzurePipelines,
  isGitHubActions,
  setReporterRegistry,
} from "../src/reporters.ts";
import type { Reporter, ReporterPropOverrides } from "../src/types.ts";

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
    // Drop any cached singleton so env changes are observed by each test
    setReporterRegistry(undefined);
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
    setReporterRegistry(undefined);
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

    it("caches built-in lookups so repeated calls return the same instance", () => {
      strictEqual(getReporter("github"), getReporter("github"));
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

  describe("createReporter", () => {
    it("creates a fresh instance each call (no cache)", () => {
      const a = createReporter("console");
      const b = createReporter("console");
      ok(a !== b);
    });

    it("applies property overrides", () => {
      const r = createReporter("console", { name: "verbose", noColors: true });
      equal(r.name, "verbose");
      equal(r.noColors, true);
    });

    it("throws for unknown built-in names", () => {
      throws(() => createReporter("missing"), /Unknown reporter type: missing/);
    });
  });

  describe("ReporterRegistry", () => {
    it("can be instantiated and used directly without affecting the singleton", () => {
      const local = new ReporterRegistry();
      const singletonGH = getReporter("github");
      const localGH = local.getReporter("github");
      // Both are valid github reporters, but they come from different caches
      equal(localGH.name, "github");
      equal(singletonGH.name, "github");
    });

    it("reset() clears cached default and named reporters", () => {
      const r = new ReporterRegistry();
      const a = r.getReporter("github");
      const cached = r.getReporter("github");
      strictEqual(cached, a);
      r.reset();
      const b = r.getReporter("github");
      ok(a !== b, "reporter cache should be cleared after reset");
    });

    it("supports subclassing to register additional reporter types", () => {
      const tcReporter: Reporter = {
        name: "teamcity",
        noColors: true,
        asciiOnly: true,
        formatMessage: (sev, msg) =>
          `##teamcity[message text='${msg}' status='${sev.toUpperCase()}']`,
        formatFileMessage: (_sev, m) => m.message,
        formatGroup: (h, children) => [h, ...children].join("\n"),
      };

      class CustomRegistry extends ReporterRegistry {
        override createReporter(
          type: string,
          options?: ReporterPropOverrides
        ): Reporter {
          if (type === "teamcity") return tcReporter;
          return super.createReporter(type, options);
        }
      }

      const reg = new CustomRegistry();
      strictEqual(reg.getReporter("teamcity"), tcReporter);
      // Built-ins still resolve through super
      equal(reg.getReporter("github").name, "github");
    });

    it("supports subclassing to extend default-type resolution", () => {
      class GitLabAwareRegistry extends ReporterRegistry {
        override getDefaultReporterType(): string {
          if (process.env.GITLAB_CI === "true") return "console"; // pretend mapping
          return super.getDefaultReporterType();
        }
      }

      const reg = new GitLabAwareRegistry();
      process.env.GITHUB_ACTIONS = "true";
      equal(reg.getDefaultReporterType(), "github");
      delete process.env.GITHUB_ACTIONS;
      process.env.GITLAB_CI = "true";
      try {
        equal(reg.getDefaultReporterType(), "console");
      } finally {
        delete process.env.GITLAB_CI;
      }
    });

    it("respects a custom envKey override on a subclass", () => {
      class MyToolRegistry extends ReporterRegistry {
        protected override envKey = "MYTOOL_REPORTER";
      }

      const reg = new MyToolRegistry();
      process.env.MYTOOL_REPORTER = "azure";
      // Standard key is ignored
      process.env.RNX_TARGET_REPORTER = "github";
      try {
        equal(reg.getDefaultReporterType(), "azure");
      } finally {
        delete process.env.MYTOOL_REPORTER;
      }
    });
  });

  describe("singleton management", () => {
    it("getReporterRegistry lazily constructs a default instance", () => {
      setReporterRegistry(undefined);
      const a = getReporterRegistry();
      const b = getReporterRegistry();
      strictEqual(a, b);
      ok(a instanceof ReporterRegistry);
    });

    it("setReporterRegistry overrides the singleton used by top-level helpers", () => {
      const teamcityReporter: Reporter = {
        name: "teamcity",
        noColors: true,
        asciiOnly: true,
        formatMessage: (_s, m) => `[tc] ${m}`,
        formatFileMessage: (_s, m) => m.message,
        formatGroup: (h, c) => [h, ...c].join("\n"),
      };

      class CustomRegistry extends ReporterRegistry {
        override createReporter(
          type: string,
          options?: ReporterPropOverrides
        ): Reporter {
          if (type === "teamcity") return teamcityReporter;
          return super.createReporter(type, options);
        }
      }

      const custom = new CustomRegistry();
      setReporterRegistry(custom);
      strictEqual(getReporterRegistry(), custom);
      strictEqual(getReporter("teamcity"), teamcityReporter);
    });

    it("setReporterRegistry(undefined) restores a freshly-constructed default", () => {
      const custom = new ReporterRegistry();
      setReporterRegistry(custom);
      strictEqual(getReporterRegistry(), custom);
      setReporterRegistry(undefined);
      const next = getReporterRegistry();
      ok(next !== custom, "a new default instance should be created");
    });
  });
});
