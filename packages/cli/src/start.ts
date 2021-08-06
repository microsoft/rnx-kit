import type { Config as CLIConfig } from "@react-native-community/cli-types";
import {
  createDevServerMiddleware,
  indexPageMiddleware,
} from "@react-native-community/cli-server-api";
import {
  createTerminal,
  loadMetroConfig,
  startServer,
} from "@rnx-kit/metro-service";
import { Service } from "@rnx-kit/typescript-service";
import chalk from "chalk";
import type { Reporter, ReportableEvent } from "metro";
import type Server from "metro/src/Server";
import type { Middleware } from "metro-config";
import path from "path";
import readline from "readline";
import { getKitServerConfig } from "./kit-config";
import { customizeMetroConfig } from "./metro-config";
import type { TSProjectInfo } from "./types";

export type CLIStartOptions = {
  host: string;
  port: number;
  projectRoot?: string;
  watchFolders?: string[];
  assetPlugins?: string[];
  sourceExts?: string[];
  maxWorkers?: number;
  customLogReporterPath?: string;
  https?: boolean;
  key?: string;
  cert?: string;
  resetCache?: boolean;
  config?: string;
  interactive: boolean;
};

export async function rnxStart(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIStartOptions
): Promise<void> {
  const serverConfig = getKitServerConfig(cliOptions);
  if (!serverConfig) {
    return Promise.resolve();
  }

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
        terminal.log("To reload the app press '" + chalk.cyanBright("r") + "'");
        terminal.log(
          "To open developer menu press '" + chalk.cyanBright("d") + "'"
        );
        terminal.log(
          "To quit, press '" +
            chalk.cyanBright("control") +
            "-" +
            chalk.cyanBright("c") +
            "'"
        );
      }
    },
  };

  // load Metro configuration, applying overrides from the command line
  const metroConfig = await loadMetroConfig(cliConfig, {
    ...cliOptions,
    projectRoot: path.resolve(serverConfig.projectRoot),
    reporter,
    ...(serverConfig.sourceExts ? { sourceExts: serverConfig.sourceExts } : {}),
    ...(serverConfig.assetPlugins
      ? {
          assetPlugins: serverConfig.assetPlugins.map((p) =>
            require.resolve(p)
          ),
        }
      : {}),
  });

  // prepare for typescript validation, if requested
  let tsprojectInfo: TSProjectInfo | undefined;
  if (serverConfig.typescriptValidation) {
    const tsservice = new Service((message) => terminal.log(message));

    const configFileName = tsservice.findProject(
      metroConfig.projectRoot,
      "tsconfig.json"
    );
    if (!configFileName) {
      terminal.log(
        chalk.yellow(
          `Warning: cannot find tsconfig.json under project root '${metroConfig.projectRoot}' -- skipping TypeScript validation`
        )
      );
    } else {
      tsprojectInfo = {
        service: tsservice,
        configFileName,
      };
    }
  }

  // customize the metro config to include plugins, presets, etc.
  customizeMetroConfig(
    metroConfig,
    serverConfig.detectCyclicDependencies,
    serverConfig.detectDuplicateDependencies,
    tsprojectInfo,
    serverConfig.experimental_treeShake
  );

  // create middleware -- a collection of plugins which handle incoming
  // http(s) requests, routing them to static pages or JS functions.
  const { middleware, attachToServer } = createDevServerMiddleware({
    host: cliOptions.host,
    port: metroConfig.server.port,
    watchFolders: metroConfig.watchFolders,
  });
  middleware.use(indexPageMiddleware);

  // merge the Metro config middleware with our middleware
  const enhanceMiddleware = metroConfig.server.enhanceMiddleware;
  // eslint-disable-next-line
  // @ts-ignore
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

  // start the Metro server
  const serverInstance = await startServer(metroConfig, {
    host: cliOptions.host,
    secure: cliOptions.https,
    secureCert: cliOptions.cert,
    secureKey: cliOptions.key,
  });
  const { messageSocket, eventsSocket } = attachToServer(serverInstance);

  // bind our `reportEvent` delegate to the Metro server
  reportEventDelegate = eventsSocket.reportEvent;

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
      } else if (name === "r") {
        terminal.log(chalk.green("Reloading app..."));
        messageSocket.broadcast("reload", undefined);
      } else if (name === "d") {
        terminal.log(chalk.green("Opening developer menu..."));
        messageSocket.broadcast("devMenu", undefined);
      } else {
        terminal.log(chalk.grey(_key));
      }
    });
  }
}
