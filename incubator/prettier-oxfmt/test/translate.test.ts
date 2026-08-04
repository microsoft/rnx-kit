import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { translate } from "../src/translate.ts";

describe("translate", () => {
  it("forwards directly-mappable flags unchanged", () => {
    const result = translate(["--check", "src/**/*.ts"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, ["--check", "src/**/*.ts"]);
    }
  });

  it("forwards value-taking flags with their value", () => {
    const result = translate([
      "--config",
      ".oxfmtrc.json",
      "--check",
      "src",
    ]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, [
        "--config",
        ".oxfmtrc.json",
        "--check",
        "src",
      ]);
    }
  });

  it("accepts the `--flag=value` form", () => {
    const result = translate(["--config=.oxfmtrc.json", "--check", "src"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, [
        "--config",
        ".oxfmtrc.json",
        "--check",
        "src",
      ]);
    }
  });

  it("resolves short aliases to their long oxfmt spelling", () => {
    const result = translate(["-c", ".oxfmtrc.json", "-l", "src"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, [
        "--config",
        ".oxfmtrc.json",
        "--list-different",
        "src",
      ]);
    }
  });

  it("renames flags that oxfmt spells differently", () => {
    const result = translate(["--no-config", "--check", "src"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, [
        "--disable-nested-config",
        "--check",
        "src",
      ]);
    }
  });

  it("drops ignored compatibility flags", () => {
    const result = translate([
      "--no-color",
      "--cache",
      "--log-level",
      "warn",
      "--check",
      "src",
    ]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, ["--check", "src"]);
    }
  });

  it("forwards stdin formatting verbatim", () => {
    const result = translate(["--stdin-filepath", "foo.ts"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, ["--stdin-filepath", "foo.ts"]);
    }
  });

  it("routes Prettier-only flags to the shim", () => {
    const result = translate(["--file-info", "foo.ts"]);
    equal(result.type, "shim");
    if (result.type === "shim") {
      equal(result.flag, "file-info");
      equal(result.value, "foo.ts");
    }
  });

  it("rejects style flags that must live in the JSON config", () => {
    const result = translate(["--single-quote", "--write", "src"]);
    equal(result.type, "error");
  });

  it("rejects a stray parser flag", () => {
    const result = translate(["--parser", "typescript", "--write", "src"]);
    equal(result.type, "error");
  });

  it("rejects unknown flags rather than silently forwarding them", () => {
    const result = translate(["--totally-made-up", "--write", "src"]);
    equal(result.type, "error");
  });

  it("errors when a value-taking flag has no value", () => {
    const result = translate(["--check", "src", "--config"]);
    equal(result.type, "error");
  });

  it("requires an explicit mode when file paths are present", () => {
    const result = translate(["src/**/*.ts"]);
    equal(result.type, "error");
  });

  it("allows flag-only invocations without a mode", () => {
    const result = translate(["--version"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, ["--version"]);
    }
  });

  it("treats `-` (stdin) as a positional, not a flag", () => {
    const result = translate(["--stdin-filepath", "foo.ts", "-"]);
    equal(result.type, "forward");
    if (result.type === "forward") {
      deepEqual(result.args, ["--stdin-filepath", "foo.ts", "-"]);
    }
  });
});
