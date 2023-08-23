import type { BabelFileResult } from "@babel/core";

describe("react-native-lazy-index", () => {
  const babel = require("@babel/core");
  const path = require("node:path");

  const currentWorkingDir = process.cwd();

  /**
   * Tests the specified fixture.
   */
  function transformFixture(
    fixture: string | Record<string, string>
  ): BabelFileResult | null {
    if (typeof fixture === "string") {
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

    const experiences = JSON.stringify(fixture);
    return babel.transformSync(
      `// @codegen\nmodule.exports = require("./src/index")(${experiences});`,
      {
        cwd: currentWorkingDir,
        filename: `index.js`,
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

  test("wraps components declared in `package.json`", () => {
    const result = transformFixture("MyAwesomeApp");
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });

  test("wraps components declared inline", () => {
    const result = transformFixture({
      "callable:YetAnotherFeature": "@awesome-app/yet-another-feature",
      "callable:YetAnotherFeatureLazy": "@awesome-app/yet-another-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      SomeFeature: "@awesome-app/some-feature",
      FinalFeature: "@awesome-app/final-feature",
    });
    expect(result).toBeTruthy();
    expect(result?.code).toMatchSnapshot();
  });
});
