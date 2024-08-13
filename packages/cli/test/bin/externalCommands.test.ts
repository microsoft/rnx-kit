import type { Config } from "@react-native-community/cli-types";
import { findExternalCommands } from "../../src/bin/externalCommands";

jest.mock("@rnx-kit/tools-react-native/context", () => ({
  resolveCommunityCLI: () => "/",
}));

function mockContext(context: unknown = {}): Config {
  return context as Config;
}

describe("findExternalCommands()", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it("returns immediately on fast path", () => {
    const context = mockContext({ __rnxFastPath: true });

    expect(findExternalCommands(context)).toEqual([]);
  });

  it("gracefully handles missing external dependencies", () => {
    const commands = findExternalCommands(mockContext());

    expect(commands.length).toBe(1);
    expect(commands[0].name).toBe("config");
  });
});
