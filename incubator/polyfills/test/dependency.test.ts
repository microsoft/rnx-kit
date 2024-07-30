import { equal, match, notEqual } from "node:assert/strict";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { getDependencyPolyfills, resolvePath } from "../src/dependency";

describe("getDependencyPolyfills()", () => {
  it("collects polyfills from included valid packages", (t) => {
    const errorMock = t.mock.method(console, "error", () => null);

    const context = { projectRoot: path.join(__dirname, "__fixtures__") };
    const polyfills = getDependencyPolyfills(context).sort();

    equal(polyfills.length, 2);
    match(
      polyfills[0],
      /[/\\]node_modules[/\\]@react-native-webapis[/\\]battery-status[/\\]polyfill.js$/
    );
    match(
      polyfills[1],
      /[/\\]node_modules[/\\]@react-native-webapis[/\\]gamepad[/\\]polyfill.js$/
    );

    const calls = errorMock.mock.calls;

    equal(calls.length, 3);
    match(
      calls[0].arguments[1],
      /^invalid-polyfill-boolean: invalid polyfill path/
    );
    match(
      calls[1].arguments[1],
      /^invalid-polyfill-boundary: invalid polyfill path/
    );
    match(calls[2].arguments[1], /^invalid-polyfill-missing: no such polyfill/);
  });
});

describe("resolvePath()", () => {
  it("rejects invalid paths", () => {
    equal(resolvePath(__dirname, ""), null);
    equal(resolvePath(__dirname, []), null);
    equal(resolvePath(__dirname, false), null);
    equal(resolvePath(__dirname, null), null);
    equal(resolvePath(__dirname, undefined), null);
  });

  it("rejects paths outside the package boundary", () => {
    equal(resolvePath(__dirname, "/bin/sh"), null);

    equal(resolvePath(__dirname, "../../bin/sh"), null);
    equal(resolvePath(__dirname, "../bin/sh"), null);
    equal(resolvePath(__dirname, "./../bin/sh"), null);

    if (os.platform() === "win32") {
      const p = "C:\\Windows\\System32\\cmd.exe";
      equal(resolvePath(__dirname, p), null);
      equal(resolvePath(__dirname, p.toLowerCase()), null);

      equal(resolvePath(__dirname, "..\\..\\Windows\\System32\\cmd.exe"), null);
      equal(resolvePath(__dirname, "..\\Windows\\System32\\cmd.exe"), null);
      equal(resolvePath(__dirname, ".\\..\\Windows\\System32\\cmd.exe"), null);
    }
  });

  it("accepts paths inside the package boundary", () => {
    notEqual(resolvePath(__dirname, "./index.js"), null);
    notEqual(resolvePath(__dirname, "./lib/index.js"), null);
    notEqual(resolvePath(__dirname, "index.js"), null);
    notEqual(resolvePath(__dirname, "lib/index.js"), null);
  });
});
