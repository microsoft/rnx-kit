import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, mock } from "node:test";
import {
  asPackageValidationContext,
  createPackageContext,
  createPackageValidationContext,
  createYarnWorkspaceContext,
  type YarnWorkspace,
} from "../src/context.ts";
import { isJSONValidator } from "../src/json.ts";
import type { JSONValue, JSONValuePath } from "../src/types.ts";

function makeTempPackage(manifest: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tools-pkgs-ctx-"));
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(manifest, null, 2)
  );
  return dir;
}

describe("createPackageContext", () => {
  it("loads manifest from disk when not provided", () => {
    const dir = makeTempPackage({ name: "test-pkg", version: "1.0.0" });
    try {
      const ctx = createPackageContext(dir);
      equal(ctx.name, "test-pkg");
      equal(ctx.manifest.version, "1.0.0");
      equal(path.isAbsolute(ctx.root), true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("uses provided manifest without reading from disk", () => {
    const ctx = createPackageContext("/no/such/dir", {
      name: "x",
      version: "1.0.0",
    });
    equal(ctx.name, "x");
    equal(ctx.manifest.version, "1.0.0");
  });

  it("resolves relative root paths to absolute", () => {
    const dir = makeTempPackage({ name: "y" });
    try {
      const relative = path.relative(process.cwd(), dir);
      const ctx = createPackageContext(relative, { name: "y" });
      equal(path.isAbsolute(ctx.root), true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("throws when no manifest provided and file does not exist", () => {
    let threw = false;
    try {
      createPackageContext("/definitely/not/a/real/path/__tools_pkgs_test__");
    } catch {
      threw = true;
    }
    equal(threw, true);
  });
});

describe("createPackageValidationContext", () => {
  it("returns a context that satisfies both PackageContext and JSONValidator", () => {
    const dir = makeTempPackage({ name: "vt", version: "1.0.0" });
    try {
      const v = createPackageValidationContext(dir);
      equal(v.name, "vt");
      equal(typeof v.enforce, "function");
      equal(typeof v.error, "function");
      equal(typeof v.changed, "function");
      equal(typeof v.finish, "function");
      equal(isJSONValidator(v), true);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("uses provided manifest in place of reading the file", () => {
    const dir = makeTempPackage({ name: "vt", version: "1.0.0" });
    try {
      const v = createPackageValidationContext(dir, {
        name: "vt",
        version: "9.9.9",
      });
      equal(v.manifest.version, "9.9.9");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("writes the package.json on finish in fix mode", () => {
    const dir = makeTempPackage({ name: "vt", version: "1.0.0" });
    try {
      const v = createPackageValidationContext(dir, undefined, { fix: true });
      v.enforce("version", "2.0.0");
      const result = v.finish();
      equal(result.changes, true);
      const written = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf-8")
      );
      equal(written.version, "2.0.0");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("does not write package.json in non-fix mode", () => {
    const dir = makeTempPackage({ name: "vt", version: "1.0.0" });
    try {
      const v = createPackageValidationContext(dir, undefined, {
        fix: false,
        reportError: () => undefined,
      });
      v.enforce("version", "2.0.0");
      v.finish();
      const written = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf-8")
      );
      equal(written.version, "1.0.0");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe("asPackageValidationContext", () => {
  it("wraps a basic PackageContext as a validator", () => {
    const dir = makeTempPackage({ name: "as", version: "1.0.0" });
    try {
      const base = createPackageContext(dir);
      equal(isJSONValidator(base), false);
      const v = asPackageValidationContext(base);
      equal(isJSONValidator(v), true);
      equal(v.name, "as");
      equal(typeof v.enforce, "function");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("returns the same instance if already a validator", () => {
    const dir = makeTempPackage({ name: "as" });
    try {
      const v1 = createPackageValidationContext(dir);
      const v2 = asPackageValidationContext(v1);
      equal(v1 as object, v2 as object);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("infers jsonFilePath from the context root", () => {
    const dir = makeTempPackage({ name: "as", version: "1.0.0" });
    try {
      const base = createPackageContext(dir);
      const v = asPackageValidationContext(base);
      v.enforce("version", "2.0.0");
      // calling finish without changes flag still respects fix=false default
      const result = v.finish();
      equal(result.errors, true);
      equal(result.changes, false);
      // confirm file was not modified (fix not enabled by default)
      const written = JSON.parse(
        fs.readFileSync(path.join(dir, "package.json"), "utf-8")
      );
      equal(written.version, "1.0.0");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});

describe("createYarnWorkspaceContext", () => {
  function makeFakeWorkspace(cwd: string, manifest: object): YarnWorkspace {
    return {
      cwd,
      ident: null,
      manifest: manifest as YarnWorkspace["manifest"],
      set: mock.fn() as unknown as (
        path: JSONValuePath,
        value: JSONValue
      ) => void,
      unset: mock.fn() as unknown as (path: JSONValuePath) => void,
      error: mock.fn() as unknown as (message: string) => void,
    };
  }

  it("forwards set() to the workspace for non-undefined values", () => {
    const w = makeFakeWorkspace("/some/path", { name: "x" });
    const ctx = createYarnWorkspaceContext(w);
    ctx.enforce("version", "1.0.0");
    const setMock = w.set as unknown as ReturnType<typeof mock.fn>;
    equal(setMock.mock.callCount(), 1);
    deepEqual(setMock.mock.calls[0].arguments, ["version", "1.0.0"]);
  });

  it("forwards unset() to the workspace for undefined values", () => {
    const w = makeFakeWorkspace("/some/path", { name: "x" });
    const ctx = createYarnWorkspaceContext(w);
    ctx.enforce(["devDependencies", "react"], undefined);
    const unsetMock = w.unset as unknown as ReturnType<typeof mock.fn>;
    equal(unsetMock.mock.callCount(), 1);
    deepEqual(unsetMock.mock.calls[0].arguments, [
      ["devDependencies", "react"],
    ]);
  });

  it("forwards error() to the workspace", () => {
    const w = makeFakeWorkspace("/some/path", { name: "x" });
    const ctx = createYarnWorkspaceContext(w);
    ctx.error("oops");
    const errorMock = w.error as unknown as ReturnType<typeof mock.fn>;
    equal(errorMock.mock.callCount(), 1);
    deepEqual(errorMock.mock.calls[0].arguments, ["oops"]);
  });

  it("populates context fields from workspace.cwd and manifest", () => {
    const w = makeFakeWorkspace("/some/path", {
      name: "x",
      version: "1.0.0",
    });
    const ctx = createYarnWorkspaceContext(w);
    equal(ctx.name, "x");
    equal(ctx.manifest.name, "x");
    equal(path.isAbsolute(ctx.root), true);
  });

  it("changed() and finish() are no-op stubs (yarn manages state internally)", () => {
    const w = makeFakeWorkspace("/some/path", { name: "x" });
    const ctx = createYarnWorkspaceContext(w);
    ctx.changed();
    deepEqual(ctx.finish(), { changes: false, errors: false });
  });

  it("yarn-mode validator is NOT recognized by isJSONValidator (no brand)", () => {
    // The yarn adapter constructs a plain object that implements the JSONValidator
    // surface but does not go through createJSONValidator, so the brand symbol is
    // absent. This test pins down the current behavior.
    const w = makeFakeWorkspace("/some/path", { name: "x" });
    const ctx = createYarnWorkspaceContext(w);
    notEqual(isJSONValidator(ctx), true);
    ok(typeof ctx.enforce === "function");
  });
});
