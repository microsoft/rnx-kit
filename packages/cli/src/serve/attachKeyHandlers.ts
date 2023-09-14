import type { MetroTerminal } from "@rnx-kit/metro-service";
import chalk from "chalk";
import qrcode from "qrcode";
import readline from "readline";

type Options = {
  devServerUrl: string;
  help: () => void;
  messageSocketEndpoint: {
    broadcast: (type: string, params?: Record<string, unknown>) => void;
  };
  terminal: MetroTerminal["terminal"];
};

export function attachKeyHandlers({
  devServerUrl,
  help,
  messageSocketEndpoint,
  terminal,
}: Options) {
  process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_key, data) => {
    const { ctrl, name } = data;
    if (ctrl === true) {
      switch (name) {
        case "c":
          terminal.log(chalk.green("Exiting..."));
          process.exit();
          break;
        case "z":
          process.emit("SIGTSTP", "SIGTSTP");
          break;
      }
    } else {
      switch (name) {
        case "d":
          terminal.log(chalk.green("Opening developer menu..."));
          messageSocketEndpoint.broadcast("devMenu", undefined);
          break;

        case "h":
          help();
          break;

        case "j": {
          fetch(devServerUrl + "/open-debugger", { method: "POST" });
          break;
        }

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
          terminal.log(chalk.green("Reloading app..."));
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
