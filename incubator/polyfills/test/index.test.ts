import * as babel from "@babel/core";
import { deepEqual, equal, fail, match } from "node:assert/strict";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";

describe("polyfills", () => {
  const currentWorkingDir = process.cwd();
  const transformOptions = {
    plugins: [require(path.join(__dirname, "..", "lib", "index.js"))],
  };

  function setFixture(): void {
    process.chdir(path.join(__dirname, "__fixtures__"));
  }

  function transform(code: string): string | null | undefined {
    const result = babel.transformSync(code, transformOptions);
    return result?.code;
  }

  afterEach(() => {
    process.chdir(currentWorkingDir);
  });

  it("is noop without trigger word", () => {
    const code = "console.log(0);";
    equal(transform(code), code);

    setFixture();
    equal(transform(code), code);
  });

  it("is noop without polyfills", () => {
    const code = "// @react-native-webapis\nconsole.log(0);";
    equal(transform(code), code);
  });

  it("injects polyfills at the top", () => {
    setFixture();

    const code = ["// @react-native-webapis", "console.log(0);"];
    const result = transform(code.join("\n"))?.split("\n");
    if (!result) {
      fail();
    }

    match(
      result[0],
      /^import ".*?[/\\]{1,2}@react-native-webapis[/\\]{1,2}battery-status[/\\]{1,2}polyfill.js";$/
    );
    match(
      result[1],
      /^import ".*?[/\\]{1,2}@react-native-webapis[/\\]{1,2}gamepad[/\\]{1,2}polyfill.js";$/
    );
    deepEqual(result.slice(2), code);
  });
});
