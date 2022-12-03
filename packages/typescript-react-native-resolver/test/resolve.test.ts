import "jest-extended";
import path from "path";
import ts from "typescript";

import {
  resolveModule,
  resolvePackageModule,
  resolveFileModule,
} from "../src/resolve";
import type { ResolverContext } from "../src/types";

const mockTrace = jest.fn();
const context = {
  host: {
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    trace: mockTrace,
    directoryExists: ts.sys.directoryExists,
    realpath: ts.sys.realpath,
    getDirectories: ts.sys.getDirectories,
  },

  options: {
    traceResolution: true,
  },

  platformExtensions: [".ios", ".native"],
} as unknown as ResolverContext;

const extensions = [ts.Extension.Ts, ts.Extension.Tsx, ts.Extension.Dts];

const fixturePath = path.join(
  process.cwd(),
  "test",
  "__fixtures__",
  "resolve-test"
);

function pathOf(...parts: string[]): string {
  return path.join(fixturePath, ...parts);
}

describe("Resolve > resolveModule", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("resolves module path carbon", () => {
    const result = resolveModule(context, fixturePath, "carbon", extensions);
    expect(result).not.toBeNil();
    expect(result.resolvedFileName).toEqual(pathOf("carbon.ts"));
  });

  test("fails to resolve a module path that does not exist", () => {
    expect(
      resolveModule(context, fixturePath, "does-not-exist", extensions)
    ).toBeUndefined();
  });

  function resolveTest(packageDir: string, resolvedPath: string): void {
    const result = resolveModule(context, packageDir, "", extensions);
    expect(result).not.toBeNil();
    expect(result.resolvedFileName).toEqual(resolvedPath);
    expect(mockTrace).toBeCalled();
  }

  test("resolves module helium using the types package property", () => {
    resolveTest(pathOf("helium"), pathOf("helium", "types.d.ts"));
  });

  test("resolves module lithium using the typings package property", () => {
    resolveTest(pathOf("lithium"), pathOf("lithium", "lib", "typings.d.ts"));
  });

  test("resolves module boron using the main package property", () => {
    resolveTest(pathOf("boron"), pathOf("boron", "main.ts"));
  });

  test("resolves module nitrogen using index", () => {
    resolveTest(pathOf("nitrogen"), pathOf("nitrogen", "index.ts"));
  });
});

describe("Resolve > resolvePackageModule", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  function resolveTest(
    pkgName: string,
    pkgPath: string,
    resolvedPath: string
  ): void {
    const packageModuleRef = {
      name: pkgName,
      path: pkgPath,
    };

    const result = resolvePackageModule(
      context,
      packageModuleRef,
      fixturePath,
      extensions
    );
    expect(result).not.toBeNil();
    expect(result.resolvedFileName).toEqual(resolvedPath);
    expect(mockTrace).toBeCalled();
  }

  test("resolves to file element.ts in external package flourine'", () => {
    resolveTest(
      "flourine",
      "element",
      pathOf("node_modules", "flourine", "element.ts")
    );
  });

  test("resolves to default type file types.d.ts in external package flourine", () => {
    // This happens when an external package has hand-crafted type (.d.ts) files which don't
    // mirror the JavaScript (.js[x]) file names. The resolver tries to find a TypeScript
    // source or type file matching the module, but fails. It falls back to loading the
    // file referenced by types/typings (package.json) in the hope that the desired type
    // info will be in it or one of its imports.
    //
    // NOTE: TypeScript-generated type (.d.ts) files always mirror the source file names,
    // but that's not a requirement. For example, it's perfectly reasonable to have one giant
    // index.d.ts for a project with many JavaScript files.
    //
    resolveTest(
      "flourine",
      "does-not-exist",
      pathOf("node_modules", "flourine", "types.d.ts")
    );
  });

  test("resolves to @types/magnesium default type file main-types.d.ts when external package magnesium has no type information", () => {
    resolveTest(
      "magnesium",
      "does-not-exist",
      pathOf("node_modules", "@types", "magnesium", "main-types.d.ts")
    );
  });

  test("fails to resolve when the package does not exist", () => {
    expect(
      resolvePackageModule(
        context,
        { name: "does-not-exist" },
        fixturePath,
        extensions
      )
    ).toBeUndefined();
    expect(mockTrace).toBeCalled();
  });
});

describe("Resolve > resolveFileModule", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("resolves ./aluminum/core to file core.ts in directory aluminum", () => {
    const result = resolveFileModule(
      context,
      { path: "./aluminum/core" },
      fixturePath,
      extensions
    );
    expect(result).not.toBeNil();
    expect(result.resolvedFileName).toEqual(pathOf("aluminum", "core.ts"));
    expect(mockTrace).toBeCalled();
  });
});
