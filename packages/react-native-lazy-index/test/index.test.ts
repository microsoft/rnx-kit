import type { BabelFileResult } from "@babel/core";

describe("react-native-lazy-index", () => {
  const babel = require("@babel/core");
  const path = require("node:path");

  const currentWorkingDir = process.cwd();

  /**
   * Tests the specified fixture.
   */
  function transformFixture(fixture: string): BabelFileResult | null {
    const workingDir = path.join(__dirname, "__fixtures__", fixture);
    process.chdir(workingDir);
    return babel.transformSync(
      `// @codegen\nmodule.exports = require("../../../src/index")();`,
      {
        cwd: workingDir,
        filename: `${fixture}.js`,
        plugins: ["codegen"],
      }
    );
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
});
