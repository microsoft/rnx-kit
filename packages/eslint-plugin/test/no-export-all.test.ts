import { RuleTester } from "eslint";
import rule from "../src/rules/no-export-all";

jest.mock("fs");

require("fs").__setMocks({
  chopper: `
export type Predator = { kind: "$predator" };

export interface IChopper {
  kind: "$helicopter"
};

export class Chopper implements IChopper {};

export const name = "Dutch";
export function escape() {
  console.log("Get to da choppah!");
}

export { escape as escapeRe, name as nameRe };
export type { IChopper as IChopperRe, Predator as PredatorRe };
`,
  conquerer: "export * from 'destroyer'",
  destroyer: "export * from 'barbarian'",
  types: `
export type Predator = { kind: "$predator" };

export interface IChopper {
  kind: "$helicopter"
};
`,
});

const config = {
  env: {
    es6: true,
    node: true,
  },
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: "module",
  },
};

describe("disallows `export *`", () => {
  const ruleTester = new RuleTester(config);

  ruleTester.run("no-export-all", rule, {
    valid: [
      "export const name = 'Arnold';",
      "const name = 'Arnold'; export { name };",
      "export default 'Arnold';",
      "const name = 'Arnold'; export { name as default };",
      "export { escape } from 'chopper';",
    ],
    invalid: [
      {
        code: "export * from 'chopper';",
        errors: 1,
        output: [
          "export { Chopper, escape, escapeRe, name, nameRe } from 'chopper';",
          "export type { IChopper, IChopperRe, Predator, PredatorRe } from 'chopper';",
        ].join("\n"),
      },
      {
        code: "export * from 'conquerer';",
        errors: 1,
      },
      {
        code: "export * from 'this-package-does-not-exist';",
        errors: 1,
      },
      {
        code: "export * from 'types';",
        errors: 1,
        output: "export type { IChopper, Predator } from 'types';",
      },
    ],
  });
});
