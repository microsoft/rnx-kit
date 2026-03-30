//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { trimQuotes } from "../src/helpers.js";

describe("trimQuotes", () => {
  it("trims only leading and trailing quotes", () => {
    equal(trimQuotes('""'), "");
    equal(trimQuotes('"""'), '"');
    equal(trimQuotes('""""'), '""');
    equal(trimQuotes('"str"ing"'), 'str"ing');
    equal(trimQuotes('str"ing'), 'str"ing');

    equal(trimQuotes("''"), "");
    equal(trimQuotes("'''"), "'");
    equal(trimQuotes("''''"), "''");
    equal(trimQuotes("'str'ing'"), "str'ing");
    equal(trimQuotes("str'ing"), "str'ing");
  });
});
