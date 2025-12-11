import rule from "../src/rules/no-export-all.js";
import { makeRuleTester } from "./RuleTester.ts";

jest.mock("fs");

require("fs").__setMocks({
  barbarian: "export const name = 'Conan';",
  chopper: `
export enum Kind {
  Predator = 0,
  Helicopter,
}

export type Predator = { kind: Kind.Predator };

export interface IChopper {
  kind: Kind.Helicopter
};

export class Chopper implements IChopper {};

export const name = "Dutch";
export function escape() {
  console.log("Get to da choppah!");
}

export type { IChopper as IChopperRe, Predator as PredatorRe };
export { escape as escapeRe, name as nameRe };
`,
  conquerer: "export * from 'destroyer'",
  cyclic: "export * from 'cyclic'",
  "default-only": "export default {};",
  destroyer: "export * from 'barbarian'",
  "invalid-syntax": "export * from ;",
  "no-exports": '"use strict";',
  types: `
export type Predator = { kind: "$predator" };

export declare class Helicopter {
  private kind: "$helicopter";
}

export interface IChopper {
  kind: "$helicopter"
};

export declare function escape(): void;
`,
  "ts-import-equals": `
import * as chopper from 'chopper';
export import notChopper = chopper;
export import IChopper = chopper.IChopper;
export import name = chopper.name;
export import chopper = require('chopper');

namespace Foo {
  export const foo = 'foo';
}
export import foo = Foo.foo;
export const bar = 'bar';
`,
  "@fluentui/font-icons-mdl2": `
export const enum IconNames {
  PageLink = 'PageLink',
  CommentSolid = 'CommentSolid',
  ChangeEntitlements = 'ChangeEntitlements',
}
`,
  "@fluentui/react-focus": `
export declare const FocusZoneTabbableElements: {
  none: 0;
  all: 1;
  inputOnly: 2;
};

export declare type FocusZoneTabbableElements = typeof FocusZoneTabbableElements[keyof typeof FocusZoneTabbableElements];
`,
  "@fluentui/style-utilities": `
export namespace ZIndexes {
  export const Nav = 1;
  export const ScrollablePane = 1;
}
`,
});

function lines(...strings: string[]): string {
  return strings.join("\n");
}

describe("disallows `export *`", () => {
  const errorExportAll = [{ messageId: "export-all" }];
  const errorNoNamedExports = [{ messageId: "no-named-exports" }];

  const ruleTester = makeRuleTester();

  ruleTester.run("no-export-all", rule, {
    valid: [
      "export const name = 'Arnold';",
      "const name = 'Arnold'; export { name };",
      "export default 'Arnold';",
      "const name = 'Arnold'; export { name as default };",
      "export { escape } from 'chopper';",
      "export * as chopper from 'chopper';",
      {
        code: "export * from './internal';",
        options: [{ expand: "external-only" }],
      },
    ],
    invalid: [
      {
        code: "export * from 'chopper';",
        errors: errorExportAll,
        output: lines(
          "export type { IChopper, IChopperRe, Predator, PredatorRe } from 'chopper';",
          "export { Chopper, Kind, escape, escapeRe, name, nameRe } from 'chopper';"
        ),
      },
      {
        code: "export * from 'conquerer';",
        errors: errorExportAll,
        output: "export { name } from 'conquerer';",
      },
      {
        code: "export * from 'cyclic';",
        errors: errorNoNamedExports,
      },
      {
        code: "export * from 'default-only';",
        errors: errorNoNamedExports,
      },
      {
        code: "export * from 'invalid-syntax';",
        errors: errorNoNamedExports,
      },
      {
        code: "export * from 'no-exports';",
        errors: errorNoNamedExports,
      },
      {
        code: "export * from 'this-package-does-not-exist';",
        errors: errorNoNamedExports,
      },
      {
        code: "export * from 'types';",
        errors: errorExportAll,
        output: lines(
          "export type { IChopper, Predator } from 'types';",
          "export { Helicopter, escape } from 'types';"
        ),
      },
      {
        code: "export * from 'ts-import-equals';",
        errors: errorExportAll,
        output:
          "export { IChopper, bar, chopper, foo, name, notChopper } from 'ts-import-equals';",
      },
      {
        code: lines("export * from './internal';", "export * from 'types';"),
        errors: errorExportAll,
        output: lines(
          "export * from './internal';",
          "export type { IChopper, Predator } from 'types';",
          "export { Helicopter, escape } from 'types';"
        ),
        options: [{ expand: "external-only" }],
      },
      {
        code: "export * from '@fluentui/font-icons-mdl2';",
        errors: errorExportAll,
        output: "export type { IconNames } from '@fluentui/font-icons-mdl2';",
      },
      {
        code: "export * from '@fluentui/react-focus';",
        errors: errorExportAll,
        output:
          "export { FocusZoneTabbableElements } from '@fluentui/react-focus';",
      },
      {
        code: "export * from '@fluentui/style-utilities';",
        errors: errorExportAll,
        output: "export { ZIndexes } from '@fluentui/style-utilities';",
      },
    ],
  });
});
