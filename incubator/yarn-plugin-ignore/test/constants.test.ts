import { deepEqual, equal } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";
import { STUB_MODULE, STUB_PACKAGE } from "../src/constants.ts";

describe("stub package", () => {
  it("contains a valid manifest", () => {
    deepEqual(JSON.parse(STUB_PACKAGE), {
      name: "@rnx-kit/yarn-plugin-ignore/stub",
      version: "0.0.0",
      description: "Stub package for '@rnx-kit/yarn-plugin-ignore'",
      main: "index.js",
    });
  });

  it("contains a valid main file", () => {
    const input = { input: STUB_MODULE };
    const { status } = spawnSync(process.argv0, ["--check", "-"], input);

    equal(status, 0);
  });
});
