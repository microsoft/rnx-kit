import type { Config } from "@react-native-community/cli-types";
import * as path from "node:path";
import { findExternalCommands } from "../../src/bin/externalCommands.ts";

const fixtureDir = path.join(__dirname, "..", "__fixtures__", "community-cli");

jest.mock("@rnx-kit/tools-react-native/context", () => ({
  resolveCommunityCLI: () =>
    require("node:path").join(__dirname, "..", "__fixtures__", "community-cli"),
}));

describe("findExternalCommands [with cli-doctor]", () => {
  function mockContext(context: unknown = {}): Config {
    return context as Config;
  }

  afterAll(() => {
    jest.resetAllMocks();
  });

  it("appends commands from `@react-native-community/cli-doctor`", () => {
    const commands = findExternalCommands(mockContext({ root: fixtureDir }));

    const names = commands.map((cmd) => cmd.name);
    expect(names).toContain("config");
    expect(names).toContain("doctor");
  });

  it("prints the project configuration via the `config` command", () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);

    try {
      const context = mockContext({ root: fixtureDir });
      const commands = findExternalCommands(context);
      const config = commands.find((cmd) => cmd.name === "config");

      expect(config).toBeDefined();
      config?.func?.([], context, {});

      expect(log).toHaveBeenCalledTimes(1);
      expect(log.mock.calls[0][0]).toContain(JSON.stringify(fixtureDir));
    } finally {
      log.mockRestore();
    }
  });
});
