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
