import { spawnSync } from "node:child_process";
import { reactNativeConfig } from "../src/index";

describe("react-native.config.js", () => {
  it("should still act as a plugin to `@react-native-community/cli`", () => {
    // We're using `--eval` instead of `--print` here because Node 22.x seems
    // to be truncating the output.
    const { status, stdout } = spawnSync(process.argv0, [
      "--no-warnings",
      "--eval",
      `console.log(JSON.stringify(require("./react-native.config.js")))`,
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
