import type { BabelFileResult } from "@babel/core";

describe("react-native-lazy-index", () => {
  const babel = require("@babel/core");
  const { spawnSync } = require("child_process");
  const path = require("path");

  const currentWorkingDir = process.cwd();

  /**
   * Generates a sequence from RegEx matches.
   */
  function* generateSequence(
    str: string,
    regex: RegExp
  ): Generator<string, void> {
    let m = regex.exec(str);
    while (m) {
      yield m[1];
      m = regex.exec(str);
    }
  }

  /**
   * Tests the specified fixture.
   */
  function transformFixture(fixture: string): BabelFileResult | null {
    const workingDir = path.join(__dirname, "__fixtures__", fixture);
    process.chdir(workingDir);
    return babel.transformFileSync("../../../src/index.js", {
      cwd: workingDir,
      filename: `${fixture}.js`,
      plugins: ["codegen"],
    });
  }

  afterEach(() => process.chdir(currentWorkingDir));

  test("wraps AppRegistry.registerComponent calls", () => {
    const result = transformFixture("AppRegistry");
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });

  test("wraps BatchedBridge.registerCallableModule calls", () => {
    const result = transformFixture("BatchedBridge");
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });

  test("wraps registered components", () => {
    const result = transformFixture("MyAwesomeApp");
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });

  test("wraps registered components using declared entry points", () => {
    const result = transformFixture("MyOtherAwesomeApp");
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });
});
