import minimist from "minimist";
import { checkArgumentValidity } from "../src/check_arguments_validity";
import { extractAndSymbolicateErrorStack } from "../src/extract_and_process_error_stack";
import { symbolicateStackTraces } from "../src/symbolicate_stack_traces";

jest.mock("minimist");
jest.mock("../src/check_arguments_validity");
jest.mock("../src/extract_and_process_error_stack");

describe("Testing symbolicateStackTraces", () => {
  let checkArgumentValiditySpy;
  let extractAndSymbolicateErrorStackSpy;
  let minimistSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    checkArgumentValiditySpy = checkArgumentValidity as jest.MockedFunction<
      typeof checkArgumentValidity
    >;
    extractAndSymbolicateErrorStackSpy =
      extractAndSymbolicateErrorStack as jest.MockedFunction<
        typeof extractAndSymbolicateErrorStack
      >;
    minimistSpy = minimist as jest.MockedFunction<typeof minimist>;
  });

  it("should call extractAndSymbolicateErrorStack if checkArgumentValidity returns true", () => {
    checkArgumentValiditySpy.mockReturnValue(true);
    minimistSpy.mockReturnValue({});
    symbolicateStackTraces();
    expect(extractAndSymbolicateErrorStackSpy).toHaveBeenCalledTimes(1);
  });

  it("should not call extractAndSymbolicateErrorStack if checkArgumentValidity returns false", () => {
    checkArgumentValiditySpy.mockReturnValue(false);
    minimistSpy.mockReturnValue({});
    symbolicateStackTraces();
    expect(extractAndSymbolicateErrorStackSpy).toHaveBeenCalledTimes(0);
  });
});
