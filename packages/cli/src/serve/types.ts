import type * as logger from "@rnx-kit/console";
import type { Server as Middleware } from "connect";
import type { Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";
import type { RunServerOptions } from "metro";

// https://github.com/react-native-community/cli/blob/11.x/packages/cli-server-api/src/index.ts#L32
type MiddlewareOptions = {
  host?: string;
  watchFolders: readonly string[];
  port: number;
};

type WebSocketServer = Required<RunServerOptions>["websocketEndpoints"][string];

export type DevServerMiddleware = {
  websocketEndpoints: RunServerOptions["websocketEndpoints"];
  debuggerProxyEndpoint: {
    server: WebSocketServer;
    isDebuggerConnected: () => boolean;
  };
  messageSocketEndpoint: {
    server: WebSocketServer;
    broadcast: (method: string, params?: Record<string, unknown>) => void;
  };
  eventsSocketEndpoint: {
    server: WebSocketServer;
    reportEvent: (event: unknown) => void;
  };
  middleware: Middleware;
};

export type DevServerMiddleware6 = Pick<DevServerMiddleware, "middleware"> & {
  attachToServer: (server: HttpServer | HttpsServer) => {
    debuggerProxy: DevServerMiddleware["debuggerProxyEndpoint"];
    eventsSocket: DevServerMiddleware["eventsSocketEndpoint"];
    messageSocket: DevServerMiddleware["messageSocketEndpoint"];
  };
};

/** `@react-native-community/cli-server-api` */
export type CliServerApi = {
  createDevServerMiddleware: (
    options: MiddlewareOptions
  ) => DevServerMiddleware | DevServerMiddleware6;
  indexPageMiddleware: Middleware;
};

// https://github.com/facebook/react-native/blob/d208dc422c9239d126e0da674451c5898d57319d/packages/community-cli-plugin/src/commands/start/runServer.js#L32
export type StartCommandArgs = {
  assetPlugins?: string[];
  cert?: string;
  customLogReporterPath?: string;
  host?: string;
  https?: boolean;
  maxWorkers?: number;
  key?: string;
  platforms?: string[];
  port?: number;
  resetCache?: boolean;
  sourceExts?: string[];
  transformer?: string;
  watchFolders?: string[];
  config?: string;
  projectRoot?: string;
  interactive: boolean;
};

// https://github.com/facebook/react-native/blob/3e7a873f2d1c5170a7f4c88064897e74a149c5d5/packages/dev-middleware/src/createDevMiddleware.js#L40
type DevMiddlewareAPI = {
  middleware: Middleware;
  websocketEndpoints: RunServerOptions["websocketEndpoints"];
};

type DevMiddlewareOptions = {
  projectRoot: string;
  serverBaseUrl: string;
  logger?: typeof logger;
  unstable_browserLauncher?: unknown;
  unstable_eventReporter?: unknown;
  unstable_experiments?: unknown;
};

/** `@react-native/dev-middleware` */
export type CoreDevMiddleware = {
  createDevMiddleware: (options: DevMiddlewareOptions) => DevMiddlewareAPI;
};
