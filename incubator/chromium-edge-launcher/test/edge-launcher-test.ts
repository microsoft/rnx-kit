/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";

import type { Options } from "../src/edge-launcher";
import { Launcher, killAll, launch } from "../src/edge-launcher";
import { DEFAULT_FLAGS } from "../src/flags";

import * as assert from "assert";
import { spy, stub } from "sinon";

const log = require("lighthouse-logger");
const fsMock = {
  openSync: () => {
    //
  },
  closeSync: () => {
    //
  },
  writeFileSync: () => {
    //
  },
};

const launchEdgeWithOpts = async (opts: Options = {}) => {
  const spawnStub = stub().returns({ pid: "some_pid" });

  const edgeInstance = new Launcher(opts, {
    fs: fsMock as any,
    rimraf: spy() as any,
    spawn: spawnStub as any,
  });
  stub(edgeInstance, "waitUntilReady").returns(Promise.resolve());

  edgeInstance.prepare();

  try {
    await edgeInstance.launch();
    return Promise.resolve(spawnStub);
  } catch (err) {
    return Promise.reject(err);
  }
};

describe("Launcher", () => {
  beforeEach(() => {
    log.setLevel("error");
  });

  afterEach(() => {
    log.setLevel("");
  });

  it("sets default launching flags", async () => {
    const spawnStub = await launchEdgeWithOpts({ userDataDir: "some_path" });
    const edgeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(edgeFlags.find((f) => f.startsWith("--remote-debugging-port")));
    assert.ok(
      edgeFlags.find((f) => f.startsWith("--disable-background-networking"))
    );
    assert.strictEqual(edgeFlags[edgeFlags.length - 1], "about:blank");
  });

  it("accepts and uses a custom path", async () => {
    const rimrafMock = spy();
    const edgeInstance = new Launcher(
      { userDataDir: "some_path" },
      { fs: fsMock as any, rimraf: rimrafMock as any }
    );

    edgeInstance.prepare();

    await edgeInstance.destroyTmp();
    assert.strictEqual(rimrafMock.callCount, 0);
  });

  it("cleans up the tmp dir after closing", async () => {
    const rimrafMock = stub().callsFake((_, done) => done());

    const edgeInstance = new Launcher(
      {},
      { fs: fsMock as any, rimraf: rimrafMock as any }
    );

    edgeInstance.prepare();
    await edgeInstance.destroyTmp();
    assert.strictEqual(rimrafMock.callCount, 1);
  });

  it("does not delete created directory when custom path passed", () => {
    const edgeInstance = new Launcher(
      { userDataDir: "some_path" },
      { fs: fsMock as any }
    );

    edgeInstance.prepare();
    assert.strictEqual(edgeInstance.userDataDir, "some_path");
  });

  it("defaults to genering a tmp dir when no data dir is passed", () => {
    const edgeInstance = new Launcher({}, { fs: fsMock as any });
    const originalMakeTmp = edgeInstance.makeTmpDir;
    edgeInstance.makeTmpDir = () => "tmp_dir";
    edgeInstance.prepare();
    assert.strictEqual(edgeInstance.userDataDir, "tmp_dir");

    // Restore the original fn.
    edgeInstance.makeTmpDir = originalMakeTmp;
  });

  it(
    "doesn't fail when killed twice",
    async () => {
      const edgeInstance = new Launcher();
      await edgeInstance.launch();
      await edgeInstance.kill();
      await edgeInstance.kill();
    },
    30 * 1000
  );

  it("doesn't fail when killing all instances", async () => {
    await launch();
    await launch();
    const errors = await killAll();
    assert.strictEqual(errors.length, 0);
  });

  it("doesn't launch multiple edge processes", async () => {
    const edgeInstance = new Launcher();
    await edgeInstance.launch();
    const pid = edgeInstance.pid!;
    await edgeInstance.launch();
    assert.strictEqual(pid, edgeInstance.pid);
    await edgeInstance.kill();
  });

  it("gets all default flags", async () => {
    const flags = Launcher.defaultFlags();
    assert.ok(flags.length);
    assert.deepStrictEqual(flags, DEFAULT_FLAGS);
  });

  it("does not allow mutating default flags", async () => {
    const flags = Launcher.defaultFlags();
    flags.push("--new-flag");
    const currentDefaultFlags = Launcher.defaultFlags().slice();
    assert.notDeepStrictEqual(flags, currentDefaultFlags);
  });

  it("does not mutate default flags when launching", async () => {
    const originalDefaultFlags = Launcher.defaultFlags().slice();
    await launchEdgeWithOpts();
    const currentDefaultFlags = Launcher.defaultFlags().slice();
    assert.deepStrictEqual(originalDefaultFlags, currentDefaultFlags);
  });

  it("removes all default flags", async () => {
    const spawnStub = await launchEdgeWithOpts({ ignoreDefaultFlags: true });
    const edgeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(!edgeFlags.includes("--disable-extensions"));
  });

  it("removes --user-data-dir if userDataDir is false", async () => {
    const spawnStub = await launchEdgeWithOpts();
    const edgeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(!edgeFlags.includes("--user-data-dir"));
  });

  it("passes no env vars when none are passed", async () => {
    const spawnStub = await launchEdgeWithOpts();
    const spawnOptions = spawnStub.getCall(0).args[2] as { env: {} };
    assert.deepStrictEqual(spawnOptions.env, Object.assign({}, process.env));
  });

  it("passes env vars when passed", async () => {
    const envVars = { hello: "world" };
    const spawnStub = await launchEdgeWithOpts({ envVars });
    const spawnOptions = spawnStub.getCall(0).args[2] as { env: {} };
    assert.deepStrictEqual(spawnOptions.env, envVars);
  });

  it("ensure specific flags are present when passed and defaults are ignored", async () => {
    const spawnStub = await launchEdgeWithOpts({
      ignoreDefaultFlags: true,
      edgeFlags: ["--disable-extensions", "--mute-audio", "--no-first-run"],
    });
    const edgeFlags = spawnStub.getCall(0).args[1] as string[];
    assert.ok(edgeFlags.includes("--mute-audio"));
    assert.ok(edgeFlags.includes("--disable-extensions"));

    // Make sure that default flags are not present
    assert.ok(!edgeFlags.includes("--disable-background-networking"));
    assert.ok(!edgeFlags.includes("--disable-default-app"));
  });

  it("throws an error when edgePath is empty", (done) => {
    const edgeInstance = new Launcher({ edgePath: "" });
    edgeInstance.launch().catch(() => done());
  });
});
