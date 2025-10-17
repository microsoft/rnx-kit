import { URL, fileURLToPath } from "node:url";
import * as lerna from "../src/lerna.ts";
import * as pnpm from "../src/pnpm.ts";
import * as rush from "../src/rush.ts";
import * as yarn from "../src/yarn.ts";

const cwd = process.cwd();

export function setFixture(name: string): string {
  const p = fileURLToPath(new URL(`__fixtures__/${name}`, import.meta.url));
  process.chdir(p);
  return p;
}

export function unsetFixture(): void {
  process.chdir(cwd);
}

export function defineRequire() {
  // @ts-expect-error Tests are run in ESM mode where `require` is not defined
  global.require = (spec) => {
    switch (spec) {
      case "./lerna":
        return lerna;
      case "./pnpm":
        return pnpm;
      case "./rush":
        return rush;
      case "./yarn":
        return yarn;
    }
  };
}

export function undefineRequire() {
  // @ts-expect-error Tests are run in ESM mode where `require` is not defined
  global.require = undefined;
}
