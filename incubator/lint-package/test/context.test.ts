import { mockFS, type MockFS } from "@rnx-kit/tools-filesystem/mocks";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { Yarn } from "@yarnpkg/types";
import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { PackageValidationContext } from "../src/context.ts";

function makeMockPackage(
  manifest: PackageManifest,
  files: string[] = [],
  root = "/pkg"
): { fs: MockFS; root: string } {
  const entries: Record<string, string> = {
    [path.join(root, "package.json")]: JSON.stringify(manifest, null, 2),
  };
  for (const file of files) {
    entries[path.join(root, file)] = file.endsWith(".json") ? "{}" : "";
  }
  const fs = mockFS(entries);
  return { fs, root };
}

const baseManifest: PackageManifest = { name: "@scope/foo", version: "1.0.0" };

describe("PackageValidationContext.create: construction", () => {
  it("uses provided manifest without reading from disk", () => {
    const ctx = PackageValidationContext.create("/non/existent/path", {
      manifest: { ...baseManifest },
    });
    equal(ctx.manifest.name, "@scope/foo");
    equal(ctx.manifest.version, "1.0.0");
  });

  it("manifest getter returns the same reference as raw", () => {
    const manifest = { ...baseManifest };
    const ctx = PackageValidationContext.create("/anywhere", { manifest });
    equal(ctx.manifest, ctx.raw);
  });

  it("root is resolved to an absolute path", () => {
    const ctx = PackageValidationContext.create("./relative/dir", {
      manifest: { ...baseManifest },
    });
    ok(path.isAbsolute(ctx.root));
    ok(ctx.root.endsWith(path.join("relative", "dir")));
  });

  it("loads manifest from disk when not provided", () => {
    const { fs, root } = makeMockPackage(baseManifest);
    const ctx = PackageValidationContext.create(root, { fs });
    equal(ctx.manifest.name, "@scope/foo");
    equal(ctx.manifest.version, "1.0.0");
  });

  it("default header references the package path", () => {
    const errors: string[] = [];
    const ctx = PackageValidationContext.create("/tmp/lint-package-default", {
      manifest: { ...baseManifest },
      reportError: (m) => errors.push(m),
    });
    ctx.enforce("version", "9.9.9");
    ctx.finish();
    equal(errors.length, 1);
    ok(errors[0].includes("errors"));
    ok(errors[0].includes("lint-package-default"));
  });
});

describe("PackageValidationContext.create: enforce / error / finish", () => {
  it("enforce mismatch is reported and finish returns 1", () => {
    const errors: string[] = [];
    const ctx = PackageValidationContext.create("/tmp/anywhere", {
      manifest: { ...baseManifest },
      reportError: (m) => errors.push(m),
    });
    ctx.enforce("version", "2.0.0");
    equal(ctx.finish(), 1);
    equal(errors.length, 1);
    ok(errors[0].includes("version"));
  });

  it("enforce no-op leaves finish at 0", () => {
    const errors: string[] = [];
    const ctx = PackageValidationContext.create("/tmp/anywhere", {
      manifest: { ...baseManifest },
      reportError: (m) => errors.push(m),
    });
    ctx.enforce("name", "@scope/foo");
    equal(ctx.finish(), 0);
    deepEqual(errors, []);
  });

  it("error() flips finish to 1 and message appears in report", () => {
    const errors: string[] = [];
    const ctx = PackageValidationContext.create("/tmp/anywhere", {
      manifest: { ...baseManifest },
      reportError: (m) => errors.push(m),
    });
    ctx.error("custom rule failed");
    equal(ctx.finish(), 1);
    equal(errors.length, 1);
    ok(errors[0].includes("custom rule failed"));
  });

  it("fix mode mutates the manifest and returns 0 from finish", () => {
    const { fs, root } = makeMockPackage(baseManifest);
    const manifest = { ...baseManifest };
    const ctx = PackageValidationContext.create(root, {
      manifest,
      fix: true,
      fs,
    });
    ctx.enforce("version", "2.0.0");
    equal(manifest.version, "2.0.0");
    equal(ctx.finish(), 0);
    const written = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf-8") as string
    );
    equal(written.version, "2.0.0");
  });
});

describe("PackageValidationContext.create: validateJSON", () => {
  it("returns null when the requested file does not exist", () => {
    const { fs, root } = makeMockPackage(baseManifest);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    equal(ctx.validateJSON("missing.json"), null);
  });

  it("returns the same delegate validator on repeated calls", () => {
    const { fs, root } = makeMockPackage(baseManifest, ["tsconfig.json"]);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    const a = ctx.validateJSON("tsconfig.json");
    const b = ctx.validateJSON("tsconfig.json");
    ok(a);
    equal(a, b);
  });

  it("aggregates delegate errors into the outer report", () => {
    const { fs, root } = makeMockPackage(baseManifest, ["tsconfig.json"]);
    const errors: string[] = [];
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      reportError: (m) => errors.push(m),
      fs,
    });
    const ts = ctx.validateJSON("tsconfig.json");
    ok(ts);
    ts.enforce("compilerOptions.strict", true);
    equal(ctx.finish(), 1);
    equal(errors.length, 1);
    ok(errors[0].includes("compilerOptions"));
  });
});

describe("PackageValidationContext.create: hasFile / findJSConfig", () => {
  it("hasFile returns true for existing files and false otherwise", () => {
    const { fs, root } = makeMockPackage(baseManifest, ["README.md"]);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    equal(ctx.hasFile("README.md"), true);
    equal(ctx.hasFile("missing.txt"), false);
  });

  it("hasFile result is cached after first lookup", () => {
    const { fs, root } = makeMockPackage(baseManifest);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    equal(ctx.hasFile("late.txt"), false);
    // create the file after the first check; cache should still report false
    fs.writeFileSync(path.join(root, "late.txt"), "");
    equal(ctx.hasFile("late.txt"), false);
  });

  it("findJSConfig returns the first matching extension", () => {
    const { fs, root } = makeMockPackage(baseManifest, [
      "metro.config.cjs",
      "metro.config.ts",
    ]);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    const found = ctx.findJSConfig("metro.config");
    ok(found);
    // .js is checked first, then .cjs — .cjs exists, so it should win
    ok(found.endsWith(".cjs"), `expected .cjs, got ${found}`);
  });

  it("findJSConfig returns undefined when no extension matches", () => {
    const { fs, root } = makeMockPackage(baseManifest);
    const ctx = PackageValidationContext.create(root, {
      manifest: baseManifest,
      fs,
    });
    equal(ctx.findJSConfig("nope.config"), undefined);
  });
});

describe("PackageValidationContext.create: kitConfig", () => {
  it("returns {} when the manifest has no rnx-kit field", () => {
    const ctx = PackageValidationContext.create("/anywhere", {
      manifest: { ...baseManifest },
    });
    deepEqual(ctx.kitConfig, {});
  });

  it("returns the rnx-kit field when present and no extends", () => {
    const manifest = {
      ...baseManifest,
      "rnx-kit": { reactNativeVersion: "0.74.0" },
    } as PackageManifest;
    const ctx = PackageValidationContext.create("/anywhere", { manifest });
    deepEqual(ctx.kitConfig, { reactNativeVersion: "0.74.0" });
  });

  it("returns the same reference across reads", () => {
    const manifest = {
      ...baseManifest,
      "rnx-kit": { reactNativeVersion: "0.74.0" },
    } as PackageManifest;
    const ctx = PackageValidationContext.create("/anywhere", { manifest });
    equal(ctx.kitConfig, ctx.kitConfig);
  });

  it("dirty(['rnx-kit', ...]) invalidates the cache", () => {
    const manifest = {
      ...baseManifest,
      "rnx-kit": { reactNativeVersion: "0.74.0" },
    } as PackageManifest;
    const ctx = PackageValidationContext.create("/anywhere", { manifest });
    const before = ctx.kitConfig;
    // swap in a fresh object so the next read can be distinguished by reference
    manifest["rnx-kit"] = { reactNativeVersion: "0.75.0" };
    ctx.dirty(["rnx-kit", "reactNativeVersion"]);
    const after = ctx.kitConfig;
    notEqual(after, before);
    deepEqual(after, { reactNativeVersion: "0.75.0" });
  });

  it("dirty() with a non-rnx-kit path does not invalidate the cache", () => {
    const manifest = {
      ...baseManifest,
      "rnx-kit": { reactNativeVersion: "0.74.0" },
    } as PackageManifest;
    const ctx = PackageValidationContext.create("/anywhere", { manifest });
    const before = ctx.kitConfig;
    // swap in a fresh object — if the cache held, after === before
    manifest["rnx-kit"] = { reactNativeVersion: "0.75.0" };
    ctx.dirty(["dependencies", "react"]);
    equal(ctx.kitConfig, before);
  });
});

describe("PackageValidationContext.create: attach", () => {
  it("invokes the factory once per key and caches the result", () => {
    const ctx = PackageValidationContext.create("/anywhere", {
      manifest: baseManifest,
    });
    const key = Symbol("state");
    let calls = 0;
    const factory = () => {
      calls += 1;
      return { count: 1 };
    };
    const a = ctx.attach(key, factory);
    const b = ctx.attach(key, factory);
    equal(calls, 1);
    equal(a, b);
  });

  it("treats different keys as independent slots", () => {
    const ctx = PackageValidationContext.create("/anywhere", {
      manifest: baseManifest,
    });
    const a = ctx.attach(Symbol("a"), () => ({ tag: "a" }));
    const b = ctx.attach(Symbol("b"), () => ({ tag: "b" }));
    notEqual(a, b);
    equal(a.tag, "a");
    equal(b.tag, "b");
  });

  it("passes the context to the factory", () => {
    const ctx = PackageValidationContext.create("/anywhere", {
      manifest: baseManifest,
    });
    const received = ctx.attach(Symbol("ctx"), (base) => base);
    equal(received, ctx);
  });
});

describe("PackageValidationContext.createYarn", () => {
  type SetCall = { path: string[] | string; value: unknown };

  function makeFakeWorkspace(manifest: PackageManifest, cwd = "/ws/foo") {
    const sets: SetCall[] = [];
    const unsets: (string[] | string)[] = [];
    const errors: string[] = [];
    const workspace = {
      cwd,
      ident: manifest.name,
      manifest,
      pkg: {} as never,
      set(p: string[] | string, value: unknown) {
        sets.push({ path: p, value });
      },
      unset(p: string[] | string) {
        unsets.push(p);
      },
      error(message: string) {
        errors.push(message);
      },
    } as unknown as Yarn.Constraints.Workspace;
    return { workspace, sets, unsets, errors };
  }

  it("enforce routes to workspace.set", () => {
    const { workspace, sets } = makeFakeWorkspace({ ...baseManifest });
    const ctx = PackageValidationContext.createYarn(workspace);
    ctx.enforce("version", "9.9.9");
    deepEqual(sets, [{ path: ["version"], value: "9.9.9" }]);
  });

  it("error routes to workspace.error", () => {
    const { workspace, errors } = makeFakeWorkspace({ ...baseManifest });
    const ctx = PackageValidationContext.createYarn(workspace);
    ctx.error("workspace rule violation");
    deepEqual(errors, ["workspace rule violation"]);
  });

  it("finish returns 0 in workspace mode (yarn owns reporting)", () => {
    const { workspace } = makeFakeWorkspace({ ...baseManifest });
    const ctx = PackageValidationContext.createYarn(workspace);
    ctx.error("anything");
    equal(ctx.finish(), 0);
  });

  it("root comes from workspace.cwd and manifest is the workspace manifest", () => {
    const manifest = { ...baseManifest };
    const { workspace } = makeFakeWorkspace(manifest, "/ws/foo");
    const ctx = PackageValidationContext.createYarn(workspace);
    equal(ctx.root, "/ws/foo");
    equal(ctx.manifest, manifest);
    equal(ctx.manifest.name, "@scope/foo");
  });
});
