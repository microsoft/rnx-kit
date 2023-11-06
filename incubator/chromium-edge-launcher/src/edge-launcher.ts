/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";

import type { ChildProcess } from "child_process";
import * as childProcess from "child_process";
import * as fs from "fs";
import * as net from "net";
import * as rimraf from "rimraf";
import * as edgeFinder from "./edge-finder";
import { DEFAULT_FLAGS } from "./flags";
import { getRandomPort } from "./random-port";
import {
  EdgeNotInstalledError,
  InvalidUserDataDirectoryError,
  UnsupportedPlatformError,
  defaults,
  delay,
  getPlatform,
  makeTmpDir,
  toWinDirFormat,
} from "./utils";
const log = require("lighthouse-logger");
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWsl = getPlatform() === "wsl";
const isWindows = getPlatform() === "win32";
const _SIGINT = "SIGINT";
const _SIGINT_EXIT_CODE = 130;
const _SUPPORTED_PLATFORMS = new Set(["darwin", "linux", "win32", "wsl"]);

type SupportedPlatforms = "darwin" | "linux" | "win32" | "wsl";

const instances = new Set<Launcher>();

export type RimrafModule = (
  path: string,
  callback: (error: Error | null | undefined) => void
) => void;

export type Options = {
  startingUrl?: string;
  edgeFlags?: string[];
  port?: number;
  handleSIGINT?: boolean;
  edgePath?: string;
  userDataDir?: string | boolean;
  logLevel?: "verbose" | "info" | "error" | "silent";
  ignoreDefaultFlags?: boolean;
  connectionPollInterval?: number;
  maxConnectionRetries?: number;
  envVars?: Record<string, string | undefined>;
};

export type LaunchedEdge = {
  pid: number;
  port: number;
  process: ChildProcess;
  kill: () => Promise<void>;
};

export type ModuleOverrides = {
  fs?: typeof fs;
  rimraf?: RimrafModule;
  spawn?: typeof childProcess.spawn;
};

const sigintListener = async () => {
  await killAll();
  process.exit(_SIGINT_EXIT_CODE);
};

async function launch(opts: Options = {}): Promise<LaunchedEdge> {
  opts.handleSIGINT = defaults(opts.handleSIGINT, true);

  const instance = new Launcher(opts);

  // Kill spawned Edge process in case of ctrl-C.
  if (opts.handleSIGINT && instances.size === 0) {
    process.on(_SIGINT, sigintListener);
  }
  instances.add(instance);

  await instance.launch();

  const kill = async () => {
    instances.delete(instance);
    if (instances.size === 0) {
      process.removeListener(_SIGINT, sigintListener);
    }
    return instance.kill();
  };

  return {
    pid: instance.pid!,
    port: instance.port!,
    kill,
    process: instance.edge!,
  };
}

async function killAll(): Promise<Error[]> {
  const errors: Error[] = [];
  for (const instance of instances) {
    try {
      await instance.kill();
      // only delete if kill did not error
      // this means erroring instances remain in the Set
      instances.delete(instance);
    } catch (err) {
      errors.push(err as Error);
    }
  }
  return errors;
}

class Launcher {
  private tmpDirandPidFileReady = false;
  private pidFile?: string;
  private startingUrl: string;
  private outFile?: number;
  private errFile?: number;
  private edgePath?: string;
  private ignoreDefaultFlags?: boolean;
  private edgeFlags: string[];
  private requestedPort?: number;
  private connectionPollInterval: number;
  private maxConnectionRetries: number;
  private fs: typeof fs;
  private rimraf: RimrafModule;
  private spawn: typeof childProcess.spawn;
  private useDefaultProfile: boolean;
  private envVars: Record<string, string | undefined>;

  edge?: childProcess.ChildProcess;
  userDataDir?: string;
  port?: number;
  pid?: number;

  constructor(
    private opts: Options = {},
    moduleOverrides: ModuleOverrides = {}
  ) {
    this.fs = moduleOverrides.fs || fs;
    this.rimraf = moduleOverrides.rimraf || rimraf.default;
    this.spawn = moduleOverrides.spawn || spawn;

    log.setLevel(defaults(this.opts.logLevel, "silent"));

    // choose the first one (default)
    this.startingUrl = defaults(this.opts.startingUrl, "about:blank");
    this.edgeFlags = defaults(this.opts.edgeFlags, []);
    this.requestedPort = defaults(this.opts.port, 0);
    this.edgePath = this.opts.edgePath;
    this.ignoreDefaultFlags = defaults(this.opts.ignoreDefaultFlags, false);
    this.connectionPollInterval = defaults(
      this.opts.connectionPollInterval,
      500
    );
    this.maxConnectionRetries = defaults(this.opts.maxConnectionRetries, 50);
    this.envVars = defaults(opts.envVars, Object.assign({}, process.env));

    if (typeof this.opts.userDataDir === "boolean") {
      if (!this.opts.userDataDir) {
        this.useDefaultProfile = true;
        this.userDataDir = undefined;
      } else {
        throw new InvalidUserDataDirectoryError();
      }
    } else {
      this.useDefaultProfile = false;
      this.userDataDir = this.opts.userDataDir;
    }
  }

  private get flags() {
    const flags = this.ignoreDefaultFlags ? [] : DEFAULT_FLAGS.slice();
    flags.push(`--remote-debugging-port=${this.port}`);

    if (!this.ignoreDefaultFlags && getPlatform() === "linux") {
      flags.push("--disable-setuid-sandbox");
    }

    if (!this.useDefaultProfile) {
      // Place Edge profile in a custom location we'll rm -rf later
      // If in WSL, we need to use the Windows format
      flags.push(
        `--user-data-dir=${
          isWsl ? toWinDirFormat(this.userDataDir) : this.userDataDir
        }`
      );
    }

    flags.push(...this.edgeFlags);
    flags.push(this.startingUrl);

    return flags;
  }

  static defaultFlags() {
    return DEFAULT_FLAGS.slice();
  }

  /** Returns the highest priority edge installation. */
  static getFirstInstallation() {
    if (getPlatform() === "darwin") return edgeFinder.darwinFast();
    return edgeFinder[getPlatform() as SupportedPlatforms]()[0];
  }

  // Wrapper function to enable easy testing.
  makeTmpDir() {
    return makeTmpDir();
  }

  prepare() {
    const platform = getPlatform() as SupportedPlatforms;
    if (!_SUPPORTED_PLATFORMS.has(platform)) {
      throw new UnsupportedPlatformError();
    }

    this.userDataDir = this.userDataDir || this.makeTmpDir();
    this.outFile = this.fs.openSync(`${this.userDataDir}/edge-out.log`, "a");
    this.errFile = this.fs.openSync(`${this.userDataDir}/edge-err.log`, "a");

    // fix for Node4
    // you can't pass a fd to fs.writeFileSync
    this.pidFile = `${this.userDataDir}/edge.pid`;

    log.verbose("EdgeLauncher", `created ${this.userDataDir}`);

    this.tmpDirandPidFileReady = true;
  }

  async launch() {
    if (this.requestedPort !== 0) {
      this.port = this.requestedPort;

      // If an explict port is passed first look for an open connection...
      try {
        return await this.isDebuggerReady();
      } catch (err) {
        log.log(
          "EdgeLauncher",
          `No debugging port found on port ${this.port}, launching a new Edge.`
        );
      }
    }
    if (this.edgePath === undefined) {
      const installation = Launcher.getFirstInstallation();
      if (!installation) {
        throw new EdgeNotInstalledError();
      }

      this.edgePath = installation;
    }

    if (!this.tmpDirandPidFileReady) {
      this.prepare();
    }

    this.pid = await this.spawnProcess(this.edgePath);
    return Promise.resolve();
  }

  private async spawnProcess(execPath: string) {
    const spawnPromise = (async () => {
      if (this.edge) {
        log.log(
          "EdgeLauncher",
          `Edge already running with pid ${this.edge.pid}.`
        );
        return this.edge.pid;
      }

      // If a zero value port is set, it means the launcher
      // is responsible for generating the port number.
      // We do this here so that we can know the port before
      // we pass it into edge.
      if (this.requestedPort === 0) {
        this.port = await getRandomPort();
      }

      log.verbose(
        "EdgeLauncher",
        `Launching with command:\n"${execPath}" ${this.flags.join(" ")}`
      );
      console.trace(
        "EdgeLauncher",
        `Launching with command:\n"${execPath}" ${this.flags.join(" ")}`
      );
      const edge = this.spawn(execPath, this.flags, {
        detached: true,
        stdio: ["ignore", this.outFile, this.errFile],
        env: this.envVars,
      });
      this.edge = edge;

      this.fs.writeFileSync(this.pidFile!, edge.pid!.toString());

      log.verbose(
        "EdgeLauncher",
        `Edge running with pid ${edge.pid} on port ${this.port}.`
      );
      return edge.pid;
    })();

    const pid = await spawnPromise;
    await this.waitUntilReady();
    return pid;
  }

  private cleanup(client?: net.Socket) {
    if (client) {
      client.removeAllListeners();
      client.end();
      client.destroy();
      client.unref();
    }
  }

  // resolves if ready, rejects otherwise
  private isDebuggerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = net.createConnection(this.port!);
      client.once("error", (err) => {
        this.cleanup(client);
        reject(err);
      });
      client.once("connect", () => {
        this.cleanup(client);
        resolve();
      });
    });
  }

  // resolves when debugger is ready, rejects after 10 polls
  waitUntilReady() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const launcher = this;

    return new Promise<void>((resolve, reject) => {
      let retries = 0;
      let waitStatus = "Waiting for browser.";

      const poll = () => {
        if (retries === 0) {
          log.log("EdgeLauncher", waitStatus);
        }
        retries++;
        waitStatus += "..";
        log.log("EdgeLauncher", waitStatus);

        launcher
          .isDebuggerReady()
          .then(() => {
            log.log("EdgeLauncher", waitStatus + `${log.greenify(log.tick)}`);
            resolve();
          })
          .catch((err) => {
            if (retries > launcher.maxConnectionRetries) {
              log.error("EdgeLauncher", err.message);
              const stderr = this.fs.readFileSync(
                `${this.userDataDir}/edge-err.log`,
                { encoding: "utf-8" }
              );
              log.error(
                "EdgeLauncher",
                `Logging contents of ${this.userDataDir}/edge-err.log`
              );
              log.error("EdgeLauncher", stderr);
              return reject(err);
            }
            delay(launcher.connectionPollInterval).then(poll);
          });
      };
      poll();
    });
  }

  kill() {
    return new Promise<void>((resolve, reject) => {
      if (this.edge) {
        this.edge.on("close", () => {
          delete this.edge;
          this.destroyTmp().then(resolve);
        });

        log.log("EdgeLauncher", `Killing Edge instance ${this.edge.pid}`);
        try {
          if (isWindows) {
            // While pipe is the default, stderr also gets printed to process.stderr
            // if you don't explicitly set `stdio`
            execSync(`taskkill /pid ${this.edge.pid} /T /F`, { stdio: "pipe" });
          } else {
            process.kill(-this.edge.pid!);
          }
        } catch (err) {
          const message = `Edge could not be killed ${
            err ?? (err as unknown as { message: string }).message
          }`;
          log.warn("EdgeLauncher", message);
          reject(new Error(message));
        }
      } else {
        // fail silently as we did not start edge
        resolve();
      }
    });
  }

  destroyTmp() {
    return new Promise<void>((resolve) => {
      // Only clean up the tmp dir if we created it.
      if (
        this.userDataDir === undefined ||
        this.opts.userDataDir !== undefined
      ) {
        return resolve();
      }

      if (this.outFile) {
        this.fs.closeSync(this.outFile);
        delete this.outFile;
      }

      if (this.errFile) {
        this.fs.closeSync(this.errFile);
        delete this.errFile;
      }

      this.rimraf(this.userDataDir, () => resolve());
    });
  }
}

// eslint-disable-next-line no-restricted-exports
export default Launcher;
export { Launcher, killAll, launch };
