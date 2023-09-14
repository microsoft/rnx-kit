import net from "net";
import fetch from "node-fetch";

type ServerStatus =
  | "not_running"
  | "matched_server_running"
  | "port_taken"
  | "unknown";

/**
 * Determine whether we can run the dev server.
 *
 * Return values:
 * - `not_running`: The port is unoccupied.
 * - `matched_server_running`: The port is occupied by another instance of this dev server (matching the passed `projectRoot`).
 * - `port_taken`: The port is occupied by another process.
 * - `unknown`: An error was encountered; attempt server creation anyway.
 */
export async function isDevServerRunning(
  scheme: string,
  host: string,
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
      ? "matched_server_running"
      : "port_taken";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Returns whether the specified host:port is occupied.
 *
 * NOTE: The host **must** match whatever gets passed to `Metro.runServer`.
 */
async function isPortOccupied(host: string, port: number): Promise<boolean> {
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
