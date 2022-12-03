import path from "path";
import ts from "typescript";

import { findModuleFile } from "../src/module";
import type { ResolverContext, ModuleResolutionHostLike } from "../src/types";

const host: ModuleResolutionHostLike = {
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  trace: (_: string) => {
    // nop
  },
  directoryExists: ts.sys.directoryExists,
  realpath: ts.sys.realpath,
  getDirectories: ts.sys.getDirectories,
};
const platformExtensions = [".ios", ".native"];
const context = {
  host,
  options: {},
  platformExtensions,
} as unknown as ResolverContext;

const fixturePath = path.join(
  process.cwd(),
  "test",
  "__fixtures__",
  "module-test"
);

function find(
  modulePath: string,
  extensions: ts.Extension[] = [
    ts.Extension.Ts,
    ts.Extension.Tsx,
    ts.Extension.Dts,
    ts.Extension.Js,
    ts.Extension.Jsx,
  ]
): string | undefined {
  const result = findModuleFile(context, fixturePath, modulePath, extensions);
  return result ? result.resolvedFileName : undefined;
}

function pathOf(...parts: string[]): string {
  return path.join(fixturePath, ...parts);
}

describe("Module > findModuleFile > Module: red.ts", () => {
  test("finds red.ts", () => {
    expect(find("red.ts")).toEqual(pathOf("red.ts"));
  });

  test("does not find red.js", () => {
    expect(find("red.js")).toBeUndefined();
  });
});

describe("Module > findModuleFile > Module: green", () => {
  test("finds green.ts file", () => {
    expect(find("green")).toEqual(pathOf("green.ts"));
  });
});

describe("Module > findModuleFile > Module: orange", () => {
  test("prefers orange.ts file over orange.js when both exist", () => {
    expect(find("orange")).toEqual(pathOf("orange.ts"));
  });
});

describe("Module > findModuleFile > Module: yellow", () => {
  test("finds yellow.native.ts file", () => {
    expect(find("yellow")).toEqual(pathOf("yellow.native.ts"));
  });
});

describe("Module > findModuleFile > Module: blue", () => {
  test("prefers blue.native.ts over blue.ts when both exist", () => {
    expect(find("blue")).toEqual(pathOf("blue.native.ts"));
  });
});

describe("Module > findModuleFile > Module: pink", () => {
  test("prefers pink.native.js over pink.ts when both exist", () => {
    expect(find("pink")).toEqual(pathOf("pink.native.js"));
  });
});

describe("Module > findModuleFile > Module: indigo", () => {
  test("prefers indigo.ios.ts over indigo.native.ts and indigo.ts when all exist", () => {
    expect(find("indigo")).toEqual(pathOf("indigo.ios.ts"));
  });
});

describe("Module > findModuleFile > Module: cyan.js", () => {
  test("finds cyan.ts when list of allowed extensions does not include .js", () => {
    expect(find("cyan.js", [ts.Extension.Ts, ts.Extension.Tsx])).toEqual(
      pathOf("cyan.ts")
    );
  });
});

describe("Module > findModuleFile > Module: magenta.js", () => {
  test("finds magenta.ios.ts over magenta.ts when list of allowed extensions does not include .js", () => {
    expect(find("magenta.js", [ts.Extension.Ts, ts.Extension.Tsx])).toEqual(
      pathOf("magenta.ios.ts")
    );
  });
});

describe("Module > findModuleFile > Module: emerald", () => {
  test("finds index.ts under emerald when emerald is a directory", () => {
    expect(find("emerald")).toEqual(pathOf("emerald", "index.ts"));
  });
});

describe("Module > findModuleFile > Module: jade", () => {
  test("uses types property from jade/package.json when jade is a directory", () => {
    expect(find("jade")).toEqual(pathOf("jade", "enlightenment.d.ts"));
  });
});

describe("Module > findModuleFile > Module: does-not-exist", () => {
  test("finds nothing when the module does not exist as a file or a directory", () => {
    expect(find("does-not-exist")).toBeUndefined();
  });
});
