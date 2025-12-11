import rule from "../src/rules/no-foreach-with-captured-variables.js";
import { makeRuleTester } from "./RuleTester.ts";

describe("disallows `forEach` with variables outside of function scope", () => {
  const ruleTester = makeRuleTester();

  ruleTester.run("no-foreach-with-captured-variables", rule, {
    valid: [
      // Variable inside for each loop
      {
        code: `
            let arr: string[] = [];
            arr.forEach(a => {
                let variableDefinedInsideCallback = 1;
                variableDefinedInsideCallback++;
            });
        `,
      },
      // Variable inside for each loop and one outside but not call inside of the loop
      {
        code: `
                let variableDefinedOutsideLoop = 1;
                let arr: string[] = [];
                arr.forEach(a => {
                    let variableDefinedInsideCallback = 1;
                    variableDefinedInsideCallback++;
                });
                variableDefinedOutsideLoop++;
            `,
      },
      // Variable outside for of loop
      {
        code: `
            let variableDefinedOutsideLoop = 1;
            let arr: string[] = [];
            for (const a of arr) {
                variableDefinedOutsideLoop++;
            }
            `,
      },
    ],
    invalid: [
      // Variable is outside for each loop
      {
        code: `
            let variableDefinedOutsideLoop = 1;
            let arr: string[] = [];
            arr.forEach(a => {
                variableDefinedOutsideLoop++;
            });
            `,
        errors: 1,
      },
    ],
  });
});
