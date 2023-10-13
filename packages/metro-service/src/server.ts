import { requireModuleFromMetro } from "@rnx-kit/tools-react-native/metro";
import type { runServer } from "metro";
import net from "net";
import nodeFetch from "node-fetch";
import { ensureBabelConfig } from "./babel";

type ServerStatus = "not_running" | "already_running" | "in_use" | "unknown";

/**
 * Returns whether the specified host:port is occupied.
 *
 * NOTE: `host` **must** match whatever gets passed to `Metro.runServer`.
 */
async function isPortOccupied(
  host: string | undefined,
  port: number
): Promise<boolean> {
  const server = net.createServer((c) => c.end());
  try {
    await new Promise<void>((resolve, reject) => {
      server.on("error", (err) => reject(err));
      server.listen(port, host, undefined, () => resolve());
    });
    return false;
  } catch (_) {
    return true;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/**
 * Returns whether we can start a dev server.
 *
 * Return values:
 *   - `not_running`: No process is listening at given address
 *   - `already_running`: A dev server is already running for this project
 *   - `in_use`: Another process is using given address
 *   - `unknown`: An unknown error occurred
 */
export async function isDevServerRunning(
  scheme: string,
  host: string | undefined,
  port: number,
  projectRoot: string
): Promise<ServerStatus> {
  try {
    if (!(await isPortOccupied(host, port))) {
      return "not_running";
    }

    // TODO: Remove `node-fetch` when we drop support for Node 16
    const ftch = "fetch" in globalThis ? fetch : nodeFetch;
    const statusUrl = `${scheme}://${host || "localhost"}:${port}/status`;
    const statusResponse = await ftch(statusUrl);
    const body = await statusResponse.text();

    return body === "packager-status:running" &&
      statusResponse.headers.get("X-React-Native-Project-Root") === projectRoot
      ? "already_running"
      : "in_use";
  } catch (e) {
    return "unknown";
  }
}

export const startServer: typeof runServer = (config, ...args) => {
  ensureBabelConfig(config);

  const { runServer } = requireModuleFromMetro("metro", config.projectRoot);
  return runServer(config, ...args);
};
