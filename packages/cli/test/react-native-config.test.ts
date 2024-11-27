import { spawnSync } from "node:child_process";
import { reactNativeConfig } from "../src/index";

describe("react-native.config.js", () => {
  it("should still act as a plugin to `@react-native-community/cli`", () => {
    const { status, stdout } = spawnSync(process.argv0, [
      "--no-warnings",
      "--print",
      `JSON.stringify(require("./react-native.config.js"))`,
    ]);

    expect(status).toBe(0);

    const { commands } = JSON.parse(stdout.toString());
    const commandMap = Object.fromEntries(
      commands.map(({ name, description }) => [name, description])
    );

    for (const { name, description } of reactNativeConfig.commands) {
      expect(commandMap[name]).toBe(description);
    }
  });
});
