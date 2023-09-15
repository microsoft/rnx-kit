import type CliServerApi from "@react-native-community/cli-server-api";
import type { Config } from "@react-native-community/cli-types";
import * as logger from "@rnx-kit/console";
import {
  createTerminal,
  isDevServerRunning,
  loadMetroConfig,
  startServer,
} from "@rnx-kit/metro-service";
import type { ReportableEvent, Reporter, RunServerOptions } from "metro";
import type { Middleware } from "metro-config";
import type Server from "metro/src/Server";
import * as path from "path";
import { customizeMetroConfig } from "./metro-config";
import { makeHelp } from "./serve/help";
import { attachKeyHandlers } from "./serve/keyboard";
import { getKitServerConfig } from "./serve/kit-config";
import type {
  DevMiddlewareModule,
  DevServerMiddleware,
  DevServerMiddleware6,
  StartCommandArgs,
} from "./serve/types";

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

export async function rnxStart(
  _argv: string[],
  ctx: Config,
  args: StartCommandArgs
): Promise<void> {
  const serverConfig = getKitServerConfig(args);

  const { createDevServerMiddleware, indexPageMiddleware } = friendlyRequire<
    typeof CliServerApi
  >(
    "react-native",
    "@react-native-community/cli",
    "@react-native-community/cli-server-api"
  );

  // interactive mode requires raw access to stdin
  let interactive = args.interactive;
  if (interactive) {
    interactive = process.stdin.isTTY;
    if (!interactive) {
      logger.warn("Interactive mode is not supported in this environment");
    }
  }

  // load Metro configuration, applying overrides from the command line
  const metroConfig = await loadMetroConfig(ctx, {
    ...args,
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

  // create a Metro terminal and reporter for writing to the console
  const { terminal, reporter: terminalReporter } = createTerminal(
    args.customLogReporterPath
  );

  // customize the metro config to include plugins, presets, etc.
  const log = (message: string): void => terminal.log(message);
  customizeMetroConfig(metroConfig, serverConfig, log);

  const {
    projectRoot,
    server: { port },
    watchFolders,
  } = metroConfig;
  const scheme = args.https === true ? "https" : "http";
  const serverStatus = await isDevServerRunning(
    scheme,
    args.host,
    port,
    projectRoot
  );

  switch (serverStatus) {
    case "already_running":
      logger.info(
        `A dev server is already running for this project on port ${port}. ` +
          "Exiting..."
      );
      return;
    case "in_use":
      logger.error(
        `Another process is using port ${port}. Please terminate this ` +
          "process and try again, or try another port with `--port`."
      );
      return;
  }

  // create middleware -- a collection of plugins which handle incoming
  // http(s) requests, routing them to static pages or JS functions.
  const host = args.host?.length ? args.host : "localhost";
  const devServer = createDevServerMiddleware({ host, port, watchFolders });

  const coreDevMiddleware = (() => {
    try {
      // https://github.com/facebook/react-native/blob/3e7a873f2d1c5170a7f4c88064897e74a149c5d5/packages/community-cli-plugin/src/commands/start/runServer.js#L115
      const { createDevMiddleware } = friendlyRequire<DevMiddlewareModule>(
        "react-native",
        "@react-native/community-cli-plugin",
        "@react-native/dev-middleware"
      );
      return createDevMiddleware({
        projectRoot,
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
    host: args.host,
    secure: args.https,
    secureCert: args.cert,
    secureKey: args.key,
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
  } else {
    // `messageSocketEndpoint` should already be set at this point. But this
    // makes TypeScript happier.
    messageSocketEndpoint = devServer.messageSocketEndpoint;
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
    attachKeyHandlers({
      devServerUrl: `${scheme}://${host}:${port}`,
      help: printHelp,
      messageSocketEndpoint,
      terminal,
    });
  }
}
