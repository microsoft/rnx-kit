import type { BabelFileResult } from "@babel/core";

describe("react-native-lazy-index", () => {
  const babel = require("@babel/core");
  const path = require("node:path");

  const currentWorkingDir = process.cwd();

  const snapshotMyAwesomeApp = `
const {
  AppRegistry
} = require("react-native");
const BatchedBridge = require("react-native/Libraries/BatchedBridge/BatchedBridge");
BatchedBridge.registerLazyCallableModule("YetAnotherFeature", () => {
  require("@awesome-app/yet-another-feature");
  return BatchedBridge.getCallableModule("YetAnotherFeature");
});
BatchedBridge.registerLazyCallableModule("YetAnotherFeatureLazy", () => {
  require("@awesome-app/yet-another-feature");
  return BatchedBridge.getCallableModule("YetAnotherFeatureLazy");
});
BatchedBridge.registerLazyCallableModule("AnotherFeature", () => {
  require("@awesome-app/another-feature");
  return BatchedBridge.getCallableModule("AnotherFeature");
});
AppRegistry.registerComponent("SomeFeature", () => {
  require("@awesome-app/some-feature");
  return AppRegistry.getRunnable("SomeFeature").componentProvider();
});
AppRegistry.registerComponent("FinalFeature", () => {
  require("@awesome-app/final-feature");
  return AppRegistry.getRunnable("FinalFeature").componentProvider();
});
`.trim();

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
    expect(result?.code).toBe(
      `
const {
  AppRegistry
} = require("react-native");
AppRegistry.registerComponent("Component-01", () => {
  require("./component-01");
  return AppRegistry.getRunnable("Component-01").componentProvider();
});
AppRegistry.registerComponent("Component-02", () => {
  require("./component-02");
  return AppRegistry.getRunnable("Component-02").componentProvider();
});
`.trim()
    );
  });

  test("wraps BatchedBridge.registerCallableModule calls", () => {
    const result = transformFixture("BatchedBridge");
    expect(result).toBeTruthy();
    expect(result?.code).toBe(
      `
const BatchedBridge = require("react-native/Libraries/BatchedBridge/BatchedBridge");
BatchedBridge.registerLazyCallableModule("Module-01", () => {
  require("./module-01");
  return BatchedBridge.getCallableModule("Module-01");
});
BatchedBridge.registerLazyCallableModule("Module-02", () => {
  require("./module-02");
  return BatchedBridge.getCallableModule("Module-02");
});
`.trim()
    );
  });

  test("wraps components declared in `package.json`", () => {
    const result = transformFixture("MyAwesomeApp");
    expect(result).toBeTruthy();
    expect(result?.code).toBe(snapshotMyAwesomeApp);
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
    expect(result?.code).toBe(snapshotMyAwesomeApp);
  });
});
