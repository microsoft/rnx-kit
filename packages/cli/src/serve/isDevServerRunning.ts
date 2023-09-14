import net from "net";
import fetch from "node-fetch";

type ServerStatus = "not_running" | "already_running" | "in_use" | "unknown";

/**
 * Determine whether we can run the dev server.
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

    const statusUrl = `${scheme}://${host || "localhost"}:${port}/status`;
    const statusResponse = await fetch(statusUrl);
    const body = await statusResponse.text();

    return body === "packager-status:running" &&
      statusResponse.headers.get("X-React-Native-Project-Root") === projectRoot
      ? "already_running"
      : "in_use";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Returns whether the specified host:port is occupied.
 *
 * NOTE: The host **must** match whatever gets passed to `Metro.runServer`.
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
