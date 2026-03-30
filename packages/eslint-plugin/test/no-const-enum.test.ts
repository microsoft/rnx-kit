import rule from "../src/rules/no-const-enum.js";
import { makeRuleTester } from "./RuleTester.ts";

describe("disallows `const enum`", () => {
  const ruleTester = makeRuleTester();

  ruleTester.run("no-const-enum", rule, {
    valid: ["export enum Enum { ENTRY }"],
    invalid: [
      {
        code: "export const enum ConstEnum { ENTRY }",
        errors: 1,
      },
    ],
  });
});
