import { info } from "@rnx-kit/console";
import type { MetroTerminal } from "@rnx-kit/metro-service";
import * as fs from "node:fs";
import type { Server } from "node:http";
import * as path from "node:path";
import readline from "node:readline";
import qrcode from "qrcode";
import type { DevServerMiddleware } from "./types";

type OpenDebuggerKeyboardHandler = {
  handleOpenDebugger: () => Promise<void>;
  maybeHandleTargetSelection: (key: string) => boolean;
  dismiss: () => void;
};

type Params = {
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
  const resolvedPath = fs.lstatSync(reactNativePath).isSymbolicLink()
    ? path.resolve(
        path.dirname(reactNativePath),
        fs.readlinkSync(reactNativePath)
      )
    : reactNativePath;
  try {
    // Available starting with 0.76
    const cliPlugin = require.resolve(
      "@react-native/community-cli-plugin/package.json",
      { paths: [resolvedPath] }
    );
    const OpenDebuggerKeyboardHandler = require(
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

export function attachKeyHandlers(server: Server, params: Params) {
  const openDebuggerKeyboardHandler = createOpenDebuggerKeyboardHandler(params);
  const {
    devServerUrl,
    help,
    messageSocketEndpoint,
    metroTerminal: { terminal },
  } = params;

  process.on("SIGINT", () => {
    openDebuggerKeyboardHandler.dismiss();
    process.stdin.pause();
    process.stdin.setRawMode(false);
    info("Exiting...");
    server.close();
    server.closeAllConnections?.(); // This method was added in Node v18.2.0

    // Even when we close all connections, clients may keep the server alive.
    process.exit();
  });

  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_key, data) => {
    const { ctrl, name } = data;
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
          messageSocketEndpoint.broadcast("devMenu", undefined);
          break;

        case "h":
          help();
          break;

        case "j":
          openDebuggerKeyboardHandler.handleOpenDebugger();
          break;

        case "q": {
          const url = `${devServerUrl}/index.bundle`;
          qrcode.toString(url, { type: "terminal" }, (_err, qr) => {
            terminal.log("");
            terminal.log(url + ":");
            terminal.log(qr);
          });
          break;
        }

        case "r":
          info("Reloading app...");
          messageSocketEndpoint.broadcast("reload", undefined);
          break;

        case "return":
          terminal.log("");
          break;
      }
    }
  });

  readline.emitKeypressEvents(process.stdin);
}
