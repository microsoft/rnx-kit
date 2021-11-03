import { showAllHelp, showHelp } from "../../src/commands";
import { tsc } from "../../src/commands/tsc";

jest.mock("../../src/commands/tsc");

describe("Commands > showHelp", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("prints standard help info to the console", () => {
    const oldLog = console.log;
    const mockLog = jest.fn();
    console.log = mockLog;

    try {
      showHelp();
      expect(mockLog).toBeCalled();
      expect(tsc).toBeCalledTimes(1);
      expect(tsc).toBeCalledWith("--help");
    } finally {
      console.log = oldLog;
    }
  });
});

describe("Commands > showAllHelp", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("prints full help info to the console", () => {
    const oldLog = console.log;
    const mockLog = jest.fn();
    console.log = mockLog;

    try {
      showAllHelp();
      expect(mockLog).toBeCalled();
      expect(tsc).toBeCalledTimes(1);
      expect(tsc).toBeCalledWith("--all");
    } finally {
      console.log = oldLog;
    }
  });
});
