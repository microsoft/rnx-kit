import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getGroupMarkers, withLogGroup } from "../src/ci.ts";

describe("getGroupMarkers()", () => {
  it("returns GitHub Actions group markers", () => {
    const output: string[] = [];
    const { beginGroup, endGroup } = getGroupMarkers(
      (message) => output.push(message),
      { GITHUB_ACTIONS: "true" }
    );

    beginGroup("packages/app/package.json");
    endGroup();

    deepEqual(output, ["::group::packages/app/package.json", "::endgroup::"]);
  });

  it("encodes GitHub Actions group titles", () => {
    const output: string[] = [];
    const { beginGroup, endGroup } = getGroupMarkers(
      (message) => output.push(message),
      { GITHUB_ACTIONS: "true" }
    );

    beginGroup("packages/%app\r\n/package.json");
    endGroup();

    deepEqual(output, [
      "::group::packages/%25app%0D%0A/package.json",
      "::endgroup::",
    ]);
  });

  it("returns Azure DevOps group markers", () => {
    const output: string[] = [];
    const { beginGroup, endGroup } = getGroupMarkers(
      (message) => output.push(message),
      { TF_BUILD: "True" }
    );

    beginGroup("packages/app/package.json");
    endGroup();

    deepEqual(output, ["##[group]packages/app/package.json", "##[endgroup]"]);
  });

  it("does not group local output", () => {
    const output: string[] = [];
    const { beginGroup, endGroup } = getGroupMarkers(
      (message) => output.push(message),
      {}
    );

    beginGroup("packages/app/package.json");
    endGroup();

    deepEqual(output, []);
  });
});

describe("withLogGroup()", () => {
  function createConsole() {
    const output: string[] = [];

    return {
      output,
      console: {
        log: (...args: unknown[]) => output.push(args.join(" ")),
        warn: (...args: unknown[]) => output.push(args.join(" ")),
        error: (...args: unknown[]) => output.push(args.join(" ")),
      },
    };
  }

  it("does not emit an empty group", () => {
    const { console, output } = createConsole();

    withLogGroup("packages/app/package.json", () => undefined, console, {
      GITHUB_ACTIONS: "true",
    });

    deepEqual(output, []);
  });

  it("groups the first emitted log line", () => {
    const { console, output } = createConsole();

    withLogGroup(
      "packages/app/package.json",
      () => console.log("hello"),
      console,
      { GITHUB_ACTIONS: "true" }
    );

    deepEqual(output, [
      "::group::packages/app/package.json",
      "hello",
      "::endgroup::",
    ]);
  });

  it("restores the console methods", () => {
    const { console } = createConsole();
    const log = console.log;

    withLogGroup("packages/app/package.json", () => undefined, console, {
      GITHUB_ACTIONS: "true",
    });

    equal(console.log, log);
  });
});
