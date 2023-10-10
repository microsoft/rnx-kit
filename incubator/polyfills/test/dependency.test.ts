import * as os from "node:os";
import * as path from "node:path";
import { getDependencyPolyfills, resolvePath } from "../src/dependency";

describe("getDependencyPolyfills", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("collects polyfills from included valid packages", () => {
    const context = {
      projectRoot: path.join(__dirname, "__fixtures__"),
    };

    expect(getDependencyPolyfills(context).sort()).toEqual([
      expect.stringMatching(
        /[/\\]node_modules[/\\]@react-native-webapis[/\\]battery-status[/\\]polyfill.js$/
      ),
      expect.stringMatching(
        /[/\\]node_modules[/\\]@react-native-webapis[/\\]gamepad[/\\]polyfill.js$/
      ),
    ]);

    expect(consoleErrorSpy).toBeCalledTimes(3);
    expect(consoleErrorSpy).toBeCalledWith(
      "error",
      expect.stringMatching(/^invalid-polyfill-boolean: invalid polyfill path/)
    );
    expect(consoleErrorSpy).toBeCalledWith(
      "error",
      expect.stringMatching(/^invalid-polyfill-boundary: invalid polyfill path/)
    );
    expect(consoleErrorSpy).toBeCalledWith(
      "error",
      expect.stringMatching(/^invalid-polyfill-missing: no such polyfill/)
    );
  });
});

describe("resolvePath", () => {
  test("rejects invalid paths", () => {
    expect(resolvePath(__dirname, "")).toBe(null);
    expect(resolvePath(__dirname, [])).toBe(null);
    expect(resolvePath(__dirname, false)).toBe(null);
    expect(resolvePath(__dirname, null)).toBe(null);
    expect(resolvePath(__dirname, undefined)).toBe(null);
  });

  test("rejects paths outside the package boundary", () => {
    expect(resolvePath(__dirname, "/bin/sh")).toBe(null);

    expect(resolvePath(__dirname, "../../bin/sh")).toBe(null);
    expect(resolvePath(__dirname, "../bin/sh")).toBe(null);
    expect(resolvePath(__dirname, "./../bin/sh")).toBe(null);

    if (os.platform() === "win32") {
      const p = "C:\\Windows\\System32\\cmd.exe";
      expect(resolvePath(__dirname, p)).toBe(null);
      expect(resolvePath(__dirname, p.toLowerCase())).toBe(null);

      expect(resolvePath(__dirname, "..\\..\\Windows\\System32\\cmd.exe")).toBe(
        null
      );
      expect(resolvePath(__dirname, "..\\Windows\\System32\\cmd.exe")).toBe(
        null
      );
      expect(resolvePath(__dirname, ".\\..\\Windows\\System32\\cmd.exe")).toBe(
        null
      );
    }
  });

  test("accepts paths inside the package boundary", () => {
    expect(resolvePath(__dirname, "./index.js")).not.toBe(null);
    expect(resolvePath(__dirname, "./lib/index.js")).not.toBe(null);
    expect(resolvePath(__dirname, "index.js")).not.toBe(null);
    expect(resolvePath(__dirname, "lib/index.js")).not.toBe(null);
  });
});
