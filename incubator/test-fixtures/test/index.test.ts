import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { getFixtures } from "../src/index.ts";
import type { FixtureSet } from "../src/index.ts";

describe("getFixtures", () => {
  it("returns a FixtureSet for 'language'", () => {
    const fixtures = getFixtures("language");
    ok(fixtures, "expected a FixtureSet");
    ok(typeof fixtures.dir === "string");
    ok(Array.isArray(fixtures.files));
    ok(fixtures.files.length > 0, "expected at least one fixture file");
  });

  it("returns a FixtureSet for 'realworld'", () => {
    const fixtures = getFixtures("realworld");
    ok(fixtures.files.length > 0, "expected at least one fixture file");
  });

  it("returns the same instance on repeated calls", () => {
    const a = getFixtures("language");
    const b = getFixtures("language");
    equal(a, b, "expected memoised instance");
  });

  it("returns different instances for different sets", () => {
    const lang = getFixtures("language");
    const real = getFixtures("realworld");
    notEqual(lang, real);
  });

  it("lists files that exist in the fixture directory", () => {
    const fixtures = getFixtures("realworld");
    ok(fixtures.files.includes("useSlot.ts"));
  });
});

describe("FixtureSet.getSrc", () => {
  let fixtures: FixtureSet;

  it("reads a fixture file synchronously", () => {
    fixtures = getFixtures("realworld");
    const src = fixtures.getSrc("useSlot.ts");
    ok(typeof src === "string");
    ok(src.length > 0, "expected non-empty source");
    ok(src.includes("import"), "expected real source content");
  });

  it("returns cached content on subsequent calls", () => {
    fixtures = getFixtures("realworld");
    const first = fixtures.getSrc("useSlot.ts");
    const second = fixtures.getSrc("useSlot.ts");
    equal(first, second);
  });
});

describe("FixtureSet.getSrcAsync", () => {
  it("reads a fixture file asynchronously", async () => {
    const fixtures = getFixtures("language");
    const file = fixtures.files[0]!;
    const src = await fixtures.getSrcAsync(file);
    ok(typeof src === "string");
    ok(src.length > 0, "expected non-empty source");
  });

  it("returns cached content on subsequent async calls", async () => {
    const fixtures = getFixtures("language");
    const file = fixtures.files[0]!;
    const first = await fixtures.getSrcAsync(file);
    const second = await fixtures.getSrcAsync(file);
    equal(first, second);
  });

  it("returns the same content as getSrc", async () => {
    const fixtures = getFixtures("realworld");
    const file = "useSlot.ts";
    const sync = fixtures.getSrc(file);
    const async_ = await fixtures.getSrcAsync(file);
    deepEqual(sync, async_);
  });
});
