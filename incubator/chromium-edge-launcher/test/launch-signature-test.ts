/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

"use strict";

import * as assert from "assert";
import { launch } from "../src";

const log = require("lighthouse-logger");
describe("Launcher", () => {
  beforeEach(() => {
    log.setLevel("error");
  });

  afterEach(() => {
    log.setLevel("");
  });

  it("exposes expected interface when launched", async () => {
    const edge = await launch();
    assert.notStrictEqual(edge.process, undefined);
    assert.notStrictEqual(edge.pid, undefined);
    assert.notStrictEqual(edge.port, undefined);
    assert.notStrictEqual(edge.kill, undefined);
    await edge.kill();
  }, 500000);
});
