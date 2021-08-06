// Type definitions for metro 0.66
// Project: https://github.com/facebook/metro
// Definitions by: Adam Foxman <https://github.com/afoxman/>
//                 Tommy Nguyen <https://github.com/tido64/>

export * from "./Asset";
export * from "./Server";
export * from "./DeltaBundler/types";
export * from "./lib/reporting";
export * from "./ModuleGraph/types";
export * from "./ModuleGraph/worker/collectDependencies";
export * from "./shared/types";

import type { Server as HttpServer } from "http";
import type { Server as HttpsServer } from "https";
import type { ConfigT } from "metro-config";

export type { HttpServer, HttpsServer };

export type RunServerOptions = {
  hasReducedPerformance?: boolean;
  host?: string;
  onError?: (error: Error & { code?: string }) => void;
  onReady?: (server: HttpServer | HttpsServer) => void;
  runInspectorProxy?: boolean;
  secureServerOptions?: Record<string, unknown>;
  secure?: boolean; // deprecated
  secureCert?: string; // deprecated
  secureKey?: string; // deprecated
};

export function runServer(
  config: ConfigT,
  {
    hasReducedPerformance,
    host,
    onError,
    onReady,
    secureServerOptions,
    secure, //deprecated
    secureCert, // deprecated
    secureKey, // deprecated
  }: RunServerOptions
): Promise<HttpServer | HttpsServer>;
