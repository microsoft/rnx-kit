import os from "os";

import { Usage } from "../../src/usage/usage";
import { createUsageColors } from "../../src/usage/colors";

describe("Usage > usage", () => {
  test("prints usage information", () => {
    const oldLog = console.log;
    let logData = "";
    console.log = (message: string): void => {
      logData += message + os.EOL;
    };

    try {
      const usage = new Usage("rn-tsc.js", 80, "\n", createUsageColors("none"));
      usage.show();
    } finally {
      console.log = oldLog;
    }

    expect(logData.indexOf("USAGE")).toBeGreaterThanOrEqual(0);
  });
});
