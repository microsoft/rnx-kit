import { deepEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getSample,
  parseStrict,
  runApp,
  runAppFromUnknown,
  sampleNames,
  samples,
} from "../src/nodeapp/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const BUILT_CLI = path.join(PACKAGE_ROOT, "lib", "nodeapp", "cli.js");

describe("nodeapp.runApp — golden samples", () => {
  for (const sample of samples) {
    it(`matches golden for sample "${sample.name}"`, async () => {
      const out = await runApp(sample.input);
      deepEqual(out, sample.expected);
    });
  }
});

describe("nodeapp.runApp — determinism", () => {
  for (const sample of samples) {
    it(`produces stable output across two runs for "${sample.name}"`, async () => {
      const a = await runApp(sample.input);
      const b = await runApp(sample.input);
      deepEqual(a, b);
    });
  }
});

describe("nodeapp.samples", () => {
  it("exposes all four named samples", () => {
    deepEqual([...sampleNames].sort(), ["empty", "large", "small", "tiny"]);
  });

  it("getSample returns the same object that's in `samples`", () => {
    const tiny = getSample("tiny");
    ok(tiny);
    equal(
      tiny,
      samples.find((s) => s.name === "tiny")
    );
  });

  it("getSample returns undefined for unknown names", () => {
    equal(getSample("nope"), undefined);
  });
});

describe("nodeapp.parseStrict", () => {
  it("accepts valid input", () => {
    const parsed = parseStrict({
      records: [{ id: "a", group: "x", value: 1, ts: 0 }],
    });
    equal(parsed.records.length, 1);
  });

  it("rejects unknown top-level keys", () => {
    throws(
      () =>
        parseStrict({
          records: [],
          extra: 1,
        }),
      /unexpected key/
    );
  });

  it("rejects duplicate record ids", () => {
    throws(
      () =>
        parseStrict({
          records: [
            { id: "a", group: "x", value: 1, ts: 0 },
            { id: "a", group: "y", value: 2, ts: 1 },
          ],
        }),
      /duplicate id/
    );
  });

  it("rejects unknown record keys", () => {
    throws(
      () =>
        parseStrict({
          records: [{ id: "a", group: "x", value: 1, ts: 0, foo: "bar" }],
        }),
      /unexpected key/
    );
  });
});

describe("nodeapp.runAppFromUnknown — input validation", () => {
  it("rejects when input is not an object", async () => {
    await rejects(() => runAppFromUnknown(null), /input must be an object/);
  });

  it("rejects when records is missing", async () => {
    await rejects(() => runAppFromUnknown({}), /records must be an array/);
  });
});

describe("nodeapp — module-system surface", () => {
  it("loads the raw ESM constants module", async () => {
    const m = await import("../src/nodeapp/util/constants.mjs");
    equal(typeof m.EPSILON, "number");
    equal(typeof m.DEFAULT_WINDOW, "number");
  });

  it("loads the raw JS format module", async () => {
    const m = await import("../src/nodeapp/util/format.cjs");
    const cjs =
      (m as { default?: { pad?: (n: number, w: number) => string } }).default ??
      m;
    equal(typeof (cjs as { pad?: unknown }).pad, "function");
  });

  it("loads the raw .js errors module from ESM", async () => {
    const m = await import("../src/nodeapp/errors.cjs");
    const cjs =
      (m as { default?: { ParseError?: new (s: string) => Error } }).default ??
      m;
    const Ctor = (cjs as { ParseError: new (s: string) => Error }).ParseError;
    const err = new Ctor("nope");
    ok(err instanceof Error);
    equal(err.name, "ParseError");
  });

  it("loads the .ts parse module", async () => {
    const m = await import("../src/nodeapp/stages/parse.ts");
    equal(typeof m.parse, "function");
  });

  it("loads the raw .js aggregate module via dynamic import", async () => {
    const m = await import("../src/nodeapp/stages/aggregate.cjs");
    const cjs = (m as { default?: { aggregateGroups?: unknown } }).default ?? m;
    equal(
      typeof (cjs as { aggregateGroups: unknown }).aggregateGroups,
      "function"
    );
  });
});

describe("nodeapp CLI (built lib)", () => {
  const hasBuild = fs.existsSync(BUILT_CLI);
  const t = hasBuild ? it : it.skip;

  t("runs --sample tiny and produces the expected JSON", () => {
    const result = spawnSync(
      process.execPath,
      [BUILT_CLI, "--sample", "tiny"],
      {
        encoding: "utf8",
      }
    );
    equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    const tiny = getSample("tiny");
    ok(tiny);
    deepEqual(parsed, tiny.expected);
  });

  t("reads JSON input from stdin", () => {
    const input = JSON.stringify({
      records: [{ id: "a", group: "x", value: 1, ts: 0 }],
    });
    const result = spawnSync(process.execPath, [BUILT_CLI], {
      input,
      encoding: "utf8",
    });
    equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout) as { summary: { count: number } };
    equal(parsed.summary.count, 1);
  });

  t("exits non-zero on invalid input", () => {
    const result = spawnSync(process.execPath, [BUILT_CLI], {
      input: "not-json",
      encoding: "utf8",
    });
    ok(result.status !== 0);
    ok(result.stderr.length > 0);
  });
});
