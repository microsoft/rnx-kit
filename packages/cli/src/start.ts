import type CliServerApi from "@react-native-community/cli-server-api";
import type { Config as CLIConfig } from "@react-native-community/cli-types";
import logger from "@rnx-kit/console";
import type { MetroTerminal } from "@rnx-kit/metro-service";
import {
  createTerminal,
  loadMetroConfig,
  startServer,
} from "@rnx-kit/metro-service";
import chalk from "chalk";
import type { Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";
import type { ReportableEvent, Reporter, RunServerOptions } from "metro";
import type { ConfigT, Middleware } from "metro-config";
import type Server from "metro/src/Server";
import fetch from "node-fetch";
import * as os from "os";
import * as path from "path";
import qrcode from "qrcode";
import readline from "readline";
import { customizeMetroConfig } from "./metro-config";
import { getKitServerConfig } from "./serve/kit-config";

type DevServerMiddleware = ReturnType<
  (typeof CliServerApi)["createDevServerMiddleware"]
>;

type DevServerMiddleware6 = Pick<DevServerMiddleware, "middleware"> & {
  attachToServer: (server: HttpServer | HttpsServer) => {
    debuggerProxy: DevServerMiddleware["debuggerProxyEndpoint"];
    eventsSocket: DevServerMiddleware["eventsSocketEndpoint"];
    messageSocket: DevServerMiddleware["messageSocketEndpoint"];
  };
};

export type CLIStartOptions = {
  port: number;
  host: string;
  projectRoot?: string;
  watchFolders?: string[];
  assetPlugins?: string[];
  sourceExts?: string[];
  maxWorkers?: number;
  resetCache?: boolean;
  customLogReporterPath?: string;
  https?: boolean;
  key?: string;
  cert?: string;
  config?: string;
  interactive: boolean;
  id?: string;
};

// https://github.com/facebook/react-native/blob/3e7a873f2d1c5170a7f4c88064897e74a149c5d5/packages/dev-middleware/src/createDevMiddleware.js#L40
type DevMiddlewareAPI = {
  middleware: DevServerMiddleware["middleware"];
  websocketEndpoints: RunServerOptions["websocketEndpoints"];
};

type DevMiddlewareOptions = {
  projectRoot: string;
  logger?: typeof logger;
  unstable_browserLauncher?: unknown;
  unstable_eventReporter?: unknown;
  unstable_experiments?: unknown;
};

type DevMiddlewareModule = {
  createDevMiddleware: (options: DevMiddlewareOptions) => DevMiddlewareAPI;
};

type HelpOptions = {
  hasDebugger: boolean;
};

type MenuItem = [string, string];

function devServerUrl(
  cliOptions: CLIStartOptions,
  metroConfig: ConfigT
): string {
  const protocol = cliOptions.https ? "https" : "http";
  const host = cliOptions.host || os.hostname();
  const port = metroConfig.server.port;
  return `${protocol}://${host}:${port}`;
}

function friendlyRequire<T>(...modules: string[]): T {
  try {
    const modulePath = modules.reduce((startDir, module) => {
      return require.resolve(module, { paths: [startDir] });
    }, process.cwd());
    return require(modulePath) as T;
  } catch (_) {
    const module = modules[modules.length - 1];
    throw new Error(
      `Cannot find module '${module}'. This probably means that '@rnx-kit/cli' is not compatible with the version of '@react-native-community/cli' that you are currently using. Please update to the latest version and try again. If the issue still persists after the update, please file a bug at https://github.com/microsoft/rnx-kit/issues.`
    );
  }
}

function hasAttachToServerFunction(
  devServer: DevServerMiddleware | DevServerMiddleware6
): devServer is DevServerMiddleware6 {
  return "attachToServer" in devServer;
}

function makeHelp(
  terminal: MetroTerminal["terminal"],
  { hasDebugger }: HelpOptions
): () => void {
  const openDebugger: MenuItem | null = hasDebugger
    ? ["J", "Open debugger"]
    : null;

  const menuItems: ("" | MenuItem)[] = [
    ["D", "Open developer menu"],
    ...(openDebugger ? [openDebugger] : []),
    ["Q", "Show bundler address QR code"],
    ["R", "Reload the app"],
    "",
    ["H", "Show this help message"],
    ["Ctrl-C", "Quit"],
  ];

  const margin = 4;
  const maxColumnWidth = (index: number) => {
    return (max: number, item: (typeof menuItems)[number]) => {
      if (!item) {
        return max;
      }

      const width = item[index].length;
      return width > max ? width : max;
    };
  };

  const keyWidth = menuItems.reduce(maxColumnWidth(0), 0);
  const labelWidth = menuItems.reduce(maxColumnWidth(1), 0);
  const separator = `┠${"─".repeat(labelWidth + keyWidth + margin + 1)}`;

  const dim = chalk.dim;
  const lines = menuItems.map((item) => {
    if (!item) {
      return separator;
    }

    const [key, label] = item;
    const labelPadding = labelWidth - label.length;
    const keyPadding = keyWidth - key.length;
    const padding = " ".repeat(labelPadding + keyPadding + margin);
    return `┃ ${dim(label)}${padding}${key}`;
  });

  return () => {
    for (const line of lines) {
      terminal.log(line);
    }
    terminal.log("");
  };
}

export async function rnxStart(
  _argv: string[],
  cliConfig: CLIConfig,
  cliOptions: CLIStartOptions
): Promise<void> {
  const serverConfig = getKitServerConfig(cliOptions);

  const { createDevServerMiddleware, indexPageMiddleware } = friendlyRequire<
    typeof CliServerApi
  >(
    "react-native",
    "@react-native-community/cli",
    "@react-native-community/cli-server-api"
  );

  // interactive mode requires raw access to stdin
  let interactive = cliOptions.interactive;
  if (interactive) {
    interactive = process.stdin.isTTY;
    if (!interactive) {
      logger.warn(
        chalk.yellow("Interactive mode is not supported on this terminal")
      );
    }
  }

  // create a Metro terminal and reporter for writing to the console
  const { terminal, reporter: terminalReporter } = createTerminal(
    cliOptions.customLogReporterPath
  );

  // load Metro configuration, applying overrides from the command line
  const metroConfig = await loadMetroConfig(cliConfig, {
    ...cliOptions,
    ...(serverConfig.projectRoot
      ? { projectRoot: path.resolve(serverConfig.projectRoot) }
      : undefined),
    ...(serverConfig.sourceExts
      ? { sourceExts: serverConfig.sourceExts }
      : undefined),
    ...(serverConfig.assetPlugins
      ? {
          assetPlugins: serverConfig.assetPlugins.map((p) =>
            require.resolve(p)
          ),
        }
      : undefined),
  });

  // customize the metro config to include plugins, presets, etc.
  customizeMetroConfig(metroConfig, serverConfig, (message: string): void => {
    terminal.log(message);
  });

  // create middleware -- a collection of plugins which handle incoming
  // http(s) requests, routing them to static pages or JS functions.
  const devServer = createDevServerMiddleware({
    host: cliOptions.host,
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });

  const coreDevMiddleware = (() => {
    try {
      // https://github.com/facebook/react-native/blob/3e7a873f2d1c5170a7f4c88064897e74a149c5d5/packages/community-cli-plugin/src/commands/start/runServer.js#L115
      const { createDevMiddleware } = friendlyRequire<DevMiddlewareModule>(
        "react-native",
        "@react-native/community-cli-plugin",
        "@react-native/dev-middleware"
      );
      return createDevMiddleware({
        projectRoot: cliOptions.projectRoot || process.cwd(),
        logger,
        unstable_experiments: {
          // NOTE: Only affects the /open-debugger endpoint
          enableCustomDebuggerFrontend: true,
        },
      });
    } catch (_) {
      // Fallback to the behavior from before 0.73
      const middleware = devServer.middleware;
      middleware.use(indexPageMiddleware);

      // merge the Metro config middleware with our middleware
      const enhanceMiddleware = metroConfig.server.enhanceMiddleware;
      // @ts-expect-error We want to override `enhanceMiddleware`
      metroConfig.server.enhanceMiddleware = (
        metroMiddleware: Middleware,
        metroServer: Server
      ) => {
        return middleware.use(
          enhanceMiddleware
            ? enhanceMiddleware(metroMiddleware, metroServer)
            : metroMiddleware
        );
      };
      return undefined;
    }
  })();

  // `createDevServerMiddleware` changed its return type in
  // https://github.com/react-native-community/cli/pull/1560
  let websocketEndpoints: RunServerOptions["websocketEndpoints"] = undefined;
  let messageSocketEndpoint: DevServerMiddleware["messageSocketEndpoint"];
  let reportEventDelegate: Reporter["update"] | undefined = undefined;

  if (!hasAttachToServerFunction(devServer)) {
    websocketEndpoints = devServer.websocketEndpoints;
    messageSocketEndpoint = devServer.messageSocketEndpoint;

    // bind our `reportEvent` delegate to the Metro server
    reportEventDelegate = devServer.eventsSocketEndpoint.reportEvent;
  }

  const printHelp = makeHelp(terminal, {
    hasDebugger: Boolean(coreDevMiddleware),
  });

  // @ts-expect-error We want to override `reporter`
  metroConfig.reporter = {
    update(event: ReportableEvent) {
      terminalReporter.update(event);
      if (reportEventDelegate) {
        reportEventDelegate(event);
      }
      if (interactive && event.type === "dep_graph_loading") {
        printHelp();
      }
    },
  };

  const serverInstance = await startServer(metroConfig, {
    host: cliOptions.host,
    secure: cliOptions.https,
    secureCert: cliOptions.cert,
    secureKey: cliOptions.key,
    ...(coreDevMiddleware
      ? {
          unstable_extraMiddleware: [
            devServer.middleware,
            indexPageMiddleware,
            coreDevMiddleware.middleware,
          ],
          websocketEndpoints: {
            ...websocketEndpoints,
            ...coreDevMiddleware.websocketEndpoints,
          },
        }
      : { websocketEndpoints }),
  });

  if (hasAttachToServerFunction(devServer)) {
    const { messageSocket, eventsSocket } =
      devServer.attachToServer(serverInstance);
    messageSocketEndpoint = messageSocket;

    // bind our `reportEvent` delegate to the Metro server
    reportEventDelegate = eventsSocket.reportEvent;
  }

  // In Node 8, the default keep-alive for an HTTP connection is 5 seconds. In
  // early versions of Node 8, this was implemented in a buggy way which caused
  // some HTTP responses (like those containing large JS bundles) to be
  // terminated early.
  //
  // As a workaround, arbitrarily increase the keep-alive from 5 to 30 seconds,
  // which should be enough to send even the largest of JS bundles.
  //
  // For more info: https://github.com/nodejs/node/issues/13391
  //
  serverInstance.keepAliveTimeout = 30000;

  // in interactive mode, listen for keyboard events from stdin and bind
  // them to specific actions.
  if (interactive) {
    readline.emitKeypressEvents(process.stdin);

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
            printHelp();
            break;

          case "j": {
            const url = devServerUrl(cliOptions, metroConfig);
            fetch(url + "/open-debugger", { method: "POST" });
            break;
          }

          case "q": {
            const url = `${devServerUrl(cliOptions, metroConfig)}/index.bundle`;
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
  }
}
