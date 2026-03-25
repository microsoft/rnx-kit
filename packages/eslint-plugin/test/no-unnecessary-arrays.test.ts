import rule from "../src/rules/no-unnecessary-arrays.js";
import { makeRuleTester } from "./RuleTester.ts";

const ARRAY_METHODS = ["filter", "flatMap", "map", "reduce", "reduceRight"];

describe("no unnecessary array allocations", () => {
  const ruleTester = makeRuleTester();

  ruleTester.run("no-unnecessary-arrays", rule, {
    valid: [
      ...ARRAY_METHODS.map((m) => `[].${m}();`),
      ...ARRAY_METHODS.map((m) => `Array.from([]).${m}();`),
      ...ARRAY_METHODS.map((m) => `const a = []; a.${m}();`),
      ...ARRAY_METHODS.map((m) => `let a; a.map().${m}();`),
    ],
    invalid: [
      ...ARRAY_METHODS.map((m) => ({
        code: `[].map().${m}();`,
        errors: 1,
      })),
      ...ARRAY_METHODS.map((m) => ({
        code: `Array.from([]).map().${m}();`,
        errors: 1,
      })),
      ...ARRAY_METHODS.map((m) => ({
        code: `const a = []; a.map().${m}();`,
        errors: 1,
      })),
      ...ARRAY_METHODS.map((m) => ({
        code: `let a: string[]; a.map().${m}();`,
        errors: 1,
      })),
      ...ARRAY_METHODS.map((m) => ({
        code: `[].map().filter().${m}();`,
        errors: 1,
      })),
    ],
  });
});
