import { info } from "@rnx-kit/console";
import type { MetroTerminal } from "@rnx-kit/metro-service";
import * as fs from "node:fs";
import type { Server } from "node:http";
import * as path from "node:path";
import readline from "node:readline";
import qrcode from "qrcode";
import type { DevServerMiddleware } from "./types.ts";

type HttpServer = Server & {
  httpServer?: Server; // Introduced in Metro 0.83
};

export type KeyPress = {
  ctrl: boolean;
  name: string;
};

type OpenDebuggerKeyboardHandler = {
  handleOpenDebugger: () => Promise<void>;
  maybeHandleTargetSelection: (key: string) => boolean;
  dismiss: () => void;
};

export type Params = {
  devServerUrl: string;
  help: () => void;
  messageSocketEndpoint: DevServerMiddleware["messageSocketEndpoint"];
  metroTerminal: MetroTerminal;
  reactNativePath: string;
};

function createOpenDebuggerKeyboardHandler({
  devServerUrl,
  metroTerminal: { reporter },
  reactNativePath,
}: Params): OpenDebuggerKeyboardHandler {
  const resolvedPath = fs.realpathSync(reactNativePath);
  try {
    // Available starting with 0.76
    const cliPlugin = require.resolve(
      "@react-native/community-cli-plugin/package.json",
      { paths: [resolvedPath] }
    );
    const { default: OpenDebuggerKeyboardHandler } = require(
      `${path.dirname(cliPlugin)}/dist/commands/start/OpenDebuggerKeyboardHandler`
    );
    return new OpenDebuggerKeyboardHandler({ devServerUrl, reporter });
  } catch (_) {
    return {
      handleOpenDebugger: () => {
        info("Opening debugger...");
        fetch(devServerUrl + "/open-debugger", { method: "POST" });
        return Promise.resolve();
      },
      maybeHandleTargetSelection: (_: string): boolean => false,
      dismiss: () => undefined,
    };
  }
}

export function handleKeyPress(
  { ctrl, name }: KeyPress,
  openDebuggerKeyboardHandler: OpenDebuggerKeyboardHandler,
  params: Params
): void {
  if (openDebuggerKeyboardHandler.maybeHandleTargetSelection(name)) {
    return;
  }

  if (ctrl === true) {
    switch (name) {
      case "c":
      case "d":
        process.emit("SIGINT");
        break;
    }
  } else {
    switch (name) {
      case "d":
        info("Opening developer menu...");
        params.messageSocketEndpoint.broadcast("devMenu", undefined);
        break;

      case "h":
        params.help();
        break;

      case "j":
        openDebuggerKeyboardHandler.handleOpenDebugger();
        break;

      case "q": {
        const url = `${params.devServerUrl}/index.bundle`;
        const terminal = params.metroTerminal.terminal;
        qrcode.toString(url, { type: "terminal" }, (_err, qr) => {
          terminal.log("");
          terminal.log(url + ":");
          terminal.log(qr);
        });
        break;
      }

      case "r":
        info("Reloading app...");
        params.messageSocketEndpoint.broadcast("reload", undefined);
        break;

      case "return":
        params.metroTerminal.terminal.log("");
        break;
    }
  }
}

export function attachKeyHandlers(server: HttpServer, params: Params) {
  const openDebuggerKeyboardHandler = createOpenDebuggerKeyboardHandler(params);

  process.on("SIGINT", () => {
    openDebuggerKeyboardHandler.dismiss();
    process.stdin.pause();
    process.stdin.setRawMode(false);
    info("Closing all connections...");

    const httpServer = server.httpServer ?? server;
    httpServer.close();
    httpServer.closeAllConnections?.(); // This method was added in Node v18.2.0

    // Even when we close all connections, clients may keep the server alive.
    process.exit();
  });

  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_key, data) => {
    handleKeyPress(data, openDebuggerKeyboardHandler, params);
  });

  readline.emitKeypressEvents(process.stdin);
}
