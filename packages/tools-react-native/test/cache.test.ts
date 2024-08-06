import type { Config } from "@react-native-community/cli-types";
import { mockFS } from "@rnx-kit/tools-filesystem/mocks";
import { deepEqual, equal, ok } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  getSavedState,
  loadConfigFromCache,
  saveConfigToCache,
} from "../src/cache";

const config = {
  root: ".",
  reactNativePath: "node_modules/react-native",
} as Config;
const stateHash = "c3eb082d-c157-4a5a-93ef-a781bbd7ca04";
const cacheFile = path.join("node_modules", ".cache", "rnx-kit", "config.json");
const stateFile = path.join(
  "node_modules",
  ".cache",
  "rnx-kit",
  "config.sha256"
);

describe("getSavedState()", () => {
  it("returns false if there is no saved state", () => {
    ok(!getSavedState("."));
  });

  it("returns saved state", () => {
    const fsMock = mockFS({ [stateFile]: stateHash });

    equal(getSavedState(".", fsMock), stateHash);
  });
});

describe("loadConfigFromCache()", () => {
  it("returns null if cache cannot be found", () => {
    equal(loadConfigFromCache("."), null);
  });

  it("returns cached config", () => {
    const fsMock = mockFS({ [cacheFile]: JSON.stringify(config) });

    deepEqual(loadConfigFromCache(".", fsMock), config);
  });
});

describe("saveConfigToCache()", () => {
  it("writes the config and its state to disk", () => {
    const mkdirOptions = JSON.stringify({ recursive: true, mode: 0o755 });
    const vol = {};
    const fsMock = mockFS(vol);

    saveConfigToCache(".", stateHash, config, fsMock);

    equal(vol[path.dirname(cacheFile)], mkdirOptions);
    equal(vol[stateFile], stateHash);
    equal(vol[cacheFile], JSON.stringify(config));
  });
});
