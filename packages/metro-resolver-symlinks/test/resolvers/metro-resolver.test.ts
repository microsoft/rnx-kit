import * as path from "node:path";
import {
  applyMetroResolver,
  resolveModulePath,
} from "../../src/resolvers/metro-resolver.ts";
import type { ResolutionContextCompat } from "../../src/types.ts";
import { useFixture } from "../fixtures.ts";
import { makeResolverTest } from "./helper.ts";

makeResolverTest("applyMetroResolver", applyMetroResolver, {
  failed: "The module could not be resolved",
});

describe("resolveModulePath", () => {
  function makeContext(originModulePath: string): ResolutionContextCompat {
    return { originModulePath } as ResolutionContextCompat;
  }

  test("returns absolute/relative modules as is", () => {
    expect(resolveModulePath(makeContext(""), "./terminator", "")).toBe(
      "./terminator"
    );
    expect(resolveModulePath(makeContext(""), "/terminator", "")).toBe(
      "/terminator"
    );
  });

  test("resolves module path relative to requester", () => {
    const p = useFixture("duplicates");
    expect(resolveModulePath(makeContext(p), "react-native", "")).toBe(
      `.${path.sep}${path.join("duplicates", "node_modules", "react-native")}`
    );
    expect(
      resolveModulePath(
        makeContext(path.join(p, "node_modules", "terminator")),
        "react-native",
        ""
      )
    ).toBe(
      `.${path.sep}${path.join("terminator", "node_modules", "react-native")}`
    );
  });
});
