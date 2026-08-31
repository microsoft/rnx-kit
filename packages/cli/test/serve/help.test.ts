import type { MetroTerminal } from "@rnx-kit/metro-service";
import { makeHelp } from "../../src/serve/help.ts";

function mockTerminal() {
  const log = jest.fn();
  const terminal = { log } as unknown as MetroTerminal["terminal"];
  return { terminal, log };
}

describe("serve/help/makeHelp()", () => {
  it("returns a function that logs the help message", () => {
    const { terminal, log } = mockTerminal();

    const help = makeHelp(terminal, { hasDebugger: false });
    expect(log).not.toHaveBeenCalled();

    help();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("omits the debugger entry when `hasDebugger` is false", () => {
    const { terminal, log } = mockTerminal();

    makeHelp(terminal, { hasDebugger: false })();

    const message = log.mock.calls[0][0] as string;

    expect(message).not.toContain("Open debugger");
    expect(message).toContain("Open developer menu");
    expect(message).toContain("Reload the app");
  });

  it("includes the debugger entry when `hasDebugger` is true", () => {
    const { terminal, log } = mockTerminal();

    makeHelp(terminal, { hasDebugger: true })();

    const message = log.mock.calls[0][0] as string;

    expect(message).toContain("Open debugger");
    expect(message).toContain("Open developer menu");
    expect(message).toContain("Reload the app");
  });
});
