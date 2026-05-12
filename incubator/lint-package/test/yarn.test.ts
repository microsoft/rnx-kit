import type { Yarn } from "@yarnpkg/types";
import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { createYarnWorkspaceValidator } from "../src/yarn.ts";

type SetCall = { path: string[] | string; value: unknown };

function makeFakeWorkspace(initial: Record<string, unknown> = {}) {
  const sets: SetCall[] = [];
  const unsets: (string[] | string)[] = [];
  const errors: string[] = [];
  const workspace = {
    cwd: ".",
    ident: "fake",
    manifest: initial,
    pkg: {} as never,
    set(path: string[] | string, value: unknown) {
      sets.push({ path, value });
    },
    unset(path: string[] | string) {
      unsets.push(path);
    },
    error(message: string) {
      errors.push(message);
    },
  } as unknown as Yarn.Constraints.Workspace;
  return { workspace, sets, unsets, errors };
}

describe("createYarnWorkspaceValidator", () => {
  it("exposes workspace.manifest as raw", () => {
    const manifest = { name: "foo", version: "1.0.0" };
    const { workspace } = makeFakeWorkspace(manifest);
    const v = createYarnWorkspaceValidator(workspace);
    equal(v.raw, manifest);
  });

  it("enforce(path, value) routes to workspace.set with parsed segments", () => {
    const { workspace, sets } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    v.enforce("dependencies.react", "19");
    deepEqual(sets, [{ path: ["dependencies", "react"], value: "19" }]);
  });

  it("enforce with array path passes segments through verbatim", () => {
    const { workspace, sets } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    v.enforce(["exports", ".", "import"], "./lib/index.js");
    deepEqual(sets, [
      { path: ["exports", ".", "import"], value: "./lib/index.js" },
    ]);
  });

  it("enforce with undefined value routes to workspace.unset", () => {
    const { workspace, sets, unsets } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    v.enforce(["scripts", "prepack"], undefined);
    deepEqual(unsets, [["scripts", "prepack"]]);
    deepEqual(sets, []);
  });

  it("blocks prototype-pollution paths in either form", () => {
    const { workspace, sets, unsets } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    throws(() => v.enforce("__proto__.polluted", "yes"));
    throws(() => v.enforce(["constructor", "x"], 1));
    throws(() => v.enforce(["a", "prototype"], undefined));
    deepEqual(sets, []);
    deepEqual(unsets, []);
  });

  it("error() forwards to workspace.error", () => {
    const { workspace, errors } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    v.error("something is wrong");
    deepEqual(errors, ["something is wrong"]);
  });

  it("dirty() and finish() are no-ops; finish returns 0", () => {
    const { workspace } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    v.dirty([]);
    equal(v.finish(), 0);
  });

  it("fix mirrors process.argv at first call", () => {
    const { workspace } = makeFakeWorkspace();
    const v = createYarnWorkspaceValidator(workspace);
    // The flag is read once and cached. This run does not pass --fix to node,
    // so it must be false. Just assert the type and the expected default.
    equal(typeof v.fix, "boolean");
    ok(!v.fix);
  });
});
