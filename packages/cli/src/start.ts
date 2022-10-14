import type CliServerApi from "@react-native-community/cli-server-api";
import type { Config as CLIConfig } from "@react-native-community/cli-types";
import {
  createTerminal,
  loadMetroConfig,
  startServer,
} from "@rnx-kit/metro-service";
import chalk from "chalk";
import type { Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";
import type { ReportableEvent, Reporter } from "metro";
import type { Middleware } from "metro-config";
import type Server from "metro/src/Server";
import * as os from "os";
import * as path from "path";
import qrcode from "qrcode";
import readline from "readline";
import { customizeMetroConfig } from "./metro-config";
import { getKitServerConfig } from "./serve/kit-config";

type DevServerMiddleware = ReturnType<
  typeof CliServerApi["createDevServerMiddleware"]
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
};

function friendlyRequire<T>(module: string): T {
  try {
    return require(module) as T;
  } catch (_) {
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

export async function rnxStart(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIStartOptions
): Promise<void> {
  const serverConfig = getKitServerConfig(cliOptions);

  const { createDevServerMiddleware, indexPageMiddleware } = friendlyRequire<
    typeof CliServerApi
  >("@react-native-community/cli-server-api");

  // interactive mode requires raw access to stdin
  let interactive = cliOptions.interactive;
  if (interactive) {
    interactive = process.stdin.isTTY;
    if (!interactive) {
      console.warn(
        chalk.yellow(
          "Warning: Interactive mode is not supported on this terminal"
        )
      );
    }
  }

  // create a Metro terminal and reporter for writing to the console
  const { terminal, reporter: terminalReporter } = createTerminal(
    cliOptions.customLogReporterPath
  );

  // create a reporter function, to be bound to the Metro configuration.
  // which writes to the Metro terminal and
  // also notifies the `reportEvent` delegate.
  let reportEventDelegate: Reporter["update"] | undefined = undefined;
  const reporter: Reporter = {
    update(event: ReportableEvent) {
      terminalReporter.update(event);
      if (reportEventDelegate) {
        reportEventDelegate(event);
      }
      if (interactive && event.type === "dep_graph_loading") {
        const dim = chalk.dim;
        const press = dim(" › Press ");
        [
          ["r", "reload the app"],
          ["d", "open developer menu"],
          ["a", "show bundler address QR code"],
          ["ctrl-c", "quit"],
        ].forEach(([key, description]) => {
          terminal.log(press + key + dim(` to ${description}.`));
        });
      }
    },
  };

  // load Metro configuration, applying overrides from the command line
  const metroConfig = await loadMetroConfig(cliConfig, {
    ...cliOptions,
    ...(serverConfig.projectRoot
      ? { projectRoot: path.resolve(serverConfig.projectRoot) }
      : undefined),
    reporter,
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
  const middleware = devServer.middleware;
  middleware.use(indexPageMiddleware);

  // merge the Metro config middleware with our middleware
  const enhanceMiddleware = metroConfig.server.enhanceMiddleware;
  // @ts-expect-error We want to assign to read-only `enhanceMiddleware`
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

  // `createDevServerMiddleware` changed its return type in
  // https://github.com/react-native-community/cli/pull/1560
  let websocketEndpoints: unknown = undefined;
  let messageSocketEndpoint: DevServerMiddleware["messageSocketEndpoint"];

  if (!hasAttachToServerFunction(devServer)) {
    websocketEndpoints = devServer.websocketEndpoints;
    messageSocketEndpoint = devServer.messageSocketEndpoint;

    // bind our `reportEvent` delegate to the Metro server
    reportEventDelegate = devServer.eventsSocketEndpoint.reportEvent;
  }

  // start the Metro server
  const serverOptions = {
    host: cliOptions.host,
    secure: cliOptions.https,
    secureCert: cliOptions.cert,
    secureKey: cliOptions.key,
    websocketEndpoints,
  };
  const serverInstance = await startServer(metroConfig, serverOptions);

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
          case "a": {
            const protocol = cliOptions.https ? "https" : "http";
            const host = cliOptions.host || os.hostname();
            const port = metroConfig.server.port;
            const url = `${protocol}://${host}:${port}/index.bundle`;
            qrcode.toString(url, { type: "terminal" }, (_err, qr) => {
              terminal.log("");
              terminal.log(url + ":");
              terminal.log(qr);
            });
            break;
          }

          case "d":
            terminal.log(chalk.green("Opening developer menu..."));
            messageSocketEndpoint.broadcast("devMenu", undefined);
            break;

          case "r":
            terminal.log(chalk.green("Reloading app..."));
            messageSocketEndpoint.broadcast("reload", undefined);
            break;
        }
      }
    });
  }
}
