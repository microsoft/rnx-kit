import { equal } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { resolveModulePath } from "../../src/resolvers/metro-resolver.ts";
import { useFixture } from "../fixtures.ts";

describe("resolveModulePath", () => {
  function makeContext(originModulePath: string) {
    return { originModulePath };
  }

  it("returns absolute/relative modules as is", () => {
    equal(
      resolveModulePath(makeContext(""), "./terminator", ""),
      "./terminator"
    );
    equal(resolveModulePath(makeContext(""), "/terminator", ""), "/terminator");
  });

  it("resolves module path relative to requester", () => {
    const p = useFixture("duplicates");
    equal(
      resolveModulePath(makeContext(p), "react-native", ""),
      `.${path.sep}${path.join("duplicates", "node_modules", "react-native")}`
    );
    equal(
      resolveModulePath(
        makeContext(path.join(p, "node_modules", "terminator")),
        "react-native",
        ""
      ),
      `.${path.sep}${path.join("terminator", "node_modules", "react-native")}`
    );
  });
});
