import type { KeyPress, Params } from "../../src/serve/keyboard.ts";
import { handleKeyPress as handleKeyPressActual } from "../../src/serve/keyboard.ts";

const mockToString = jest.fn();
jest.mock("qrcode", () => ({
  __esModule: true,
  default: { toString: (...args: unknown[]) => mockToString(...args) },
}));

describe("handleKeyPress", () => {
  const openDebuggerKeyboardHandler = {
    handleOpenDebugger: jest.fn(() => Promise.resolve()),
    maybeHandleTargetSelection: jest.fn(() => false),
    dismiss: jest.fn(),
  };

  const help = jest.fn();
  const broadcast = jest.fn();
  const log = jest.fn();

  const params = {
    devServerUrl: "http://localhost:8081",
    help,
    messageSocketEndpoint: { broadcast },
    metroTerminal: { terminal: { log } },
    reactNativePath: "",
  } as unknown as Params;

  const handleKeyPress = (data: KeyPress) =>
    handleKeyPressActual(data, openDebuggerKeyboardHandler, params);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("lets the debugger keyboard handler consume the keypress first", () => {
    openDebuggerKeyboardHandler.maybeHandleTargetSelection.mockReturnValueOnce(
      true
    );

    handleKeyPress({ ctrl: false, name: "h" });

    expect(
      openDebuggerKeyboardHandler.maybeHandleTargetSelection
    ).toHaveBeenCalledWith("h");
    expect(help).not.toHaveBeenCalled();
  });

  it("emits SIGINT on Ctrl-C", () => {
    const emit = jest.spyOn(process, "emit").mockReturnValue(process);

    try {
      handleKeyPress({ ctrl: true, name: "c" });
      expect(emit).toHaveBeenCalledWith("SIGINT");
    } finally {
      emit.mockRestore();
    }
  });

  it("emits SIGINT on Ctrl-D", () => {
    const emit = jest.spyOn(process, "emit").mockReturnValue(process);

    try {
      handleKeyPress({ ctrl: true, name: "d" });
      expect(emit).toHaveBeenCalledWith("SIGINT");
    } finally {
      emit.mockRestore();
    }
  });

  it("opens the developer menu on 'd'", () => {
    handleKeyPress({ ctrl: false, name: "d" });

    expect(broadcast).toHaveBeenCalledWith("devMenu", undefined);
  });

  it("shows the help message on 'h'", () => {
    handleKeyPress({ ctrl: false, name: "h" });

    expect(help).toHaveBeenCalledTimes(1);
  });

  it("opens the debugger on 'j'", () => {
    handleKeyPress({ ctrl: false, name: "j" });

    expect(
      openDebuggerKeyboardHandler.handleOpenDebugger
    ).toHaveBeenCalledTimes(1);
  });

  it("prints a QR code for the bundle URL on 'q'", () => {
    handleKeyPress({ ctrl: false, name: "q" });

    expect(mockToString).toHaveBeenCalledTimes(1);
    expect(mockToString.mock.calls[0][0]).toBe(
      "http://localhost:8081/index.bundle"
    );
  });

  it("reloads the app on 'r'", () => {
    handleKeyPress({ ctrl: false, name: "r" });

    expect(broadcast).toHaveBeenCalledWith("reload", undefined);
  });

  it("logs an empty line on 'return'", () => {
    handleKeyPress({ ctrl: false, name: "return" });

    expect(log).toHaveBeenCalledWith("");
  });

  it("ignores unknown keys", () => {
    handleKeyPress({ ctrl: false, name: "x" });

    expect(broadcast).not.toHaveBeenCalled();
    expect(help).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
