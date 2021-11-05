import os from "os";

import { showVersion } from "../../src/commands";
import { tsc } from "../../src/commands/tsc";

jest.mock("../../src/commands/tsc");

describe("Commands > showVersion", () => {
  test("prints version info to the console", () => {
    const oldLog = console.log;
    let buffer = "";
    const mockLog = (message: string, ...args: string[]) => {
      buffer += message + os.EOL;
    };
    console.log = mockLog;

    try {
      showVersion();
      expect(buffer).toMatch(/rn-tsc Version/);
      expect(tsc).toBeCalledTimes(1);
      expect(tsc).toBeCalledWith("--version");
    } finally {
      console.log = oldLog;
    }
  });
});
