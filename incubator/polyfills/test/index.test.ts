import * as babel from "@babel/core";
import * as path from "node:path";

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

  test("is noop without trigger word", () => {
    const code = "console.log(0);";
    expect(transform(code)).toBe(code);

    setFixture();
    expect(transform(code)).toBe(code);
  });

  test("is noop without polyfills", () => {
    const code = "// @react-native-webapis\nconsole.log(0);";
    expect(transform(code)).toBe(code);
  });

  test("injects polyfills at the top", () => {
    setFixture();

    const code = ["// @react-native-webapis", "console.log(0);"];
    const result = transform(code.join("\n"));

    expect(result?.split("\n")).toEqual([
      expect.stringMatching(
        /^import ".*?[/\\]{1,2}@react-native-webapis[/\\]{1,2}battery-status[/\\]{1,2}polyfill.js";$/
      ),
      expect.stringMatching(
        /^import ".*?[/\\]{1,2}@react-native-webapis[/\\]{1,2}gamepad[/\\]{1,2}polyfill.js";$/
      ),
      ...code,
    ]);
  });
});
