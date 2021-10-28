import { RuleTester } from "eslint";
import rule from "../src/rules/no-export-all";

const config = {
  env: {
    es6: true,
    node: true,
  },
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
      },
    ],
  });
});
