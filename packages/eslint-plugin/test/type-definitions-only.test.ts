import rule from "../src/rules/type-definitions-only.js";
import { makeRuleTester } from "./RuleTester.ts";

describe("disallows anything but type definitions", () => {
  const ruleTester = makeRuleTester();

  ruleTester.run("type-definitions-only", rule, {
    valid: [
      "export type { Type } from './types';",
      "export type { Type as RenamedType } from './types';",
      "export type { Type, Interface } from './types';",
      "import type { Type } from './types'; export type { Type };",
      "export interface I { name: string; }",
      "export type T = string;",
      "export type T = { name: string; };",
      'export type T = "type" | "value";',
      "export function fun(): void;",
      "export declare namespace N {}",
    ],
    invalid: [
      {
        code: 'export const name = "Arnold";',
        errors: 1,
      },
      {
        code: "export function fun() { return 0; }",
        errors: 1,
      },
      {
        code: "export class C {}",
        errors: 1,
      },
      {
        code: "export enum E { A, B }",
        errors: 1,
      },
      {
        code: "export const enum E { A, B }",
        errors: 1,
      },
      {
        code: 'export namespace N { export const name = "MyNamespace"; export interface I { fun(): void; } }',
        errors: 1,
      },
      {
        code: "console.log(0);",
        errors: 1,
      },
    ],
  });
});
