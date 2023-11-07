/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";

import fs = require("fs");
import path = require("path");
import { execFileSync, execSync } from "child_process";
import { homedir } from "os";
import escapeRegExp = require("escape-string-regexp");
const log = require("lighthouse-logger");

import { EdgePathNotSetError, getLocalAppDataPath } from "./utils";

const newLineRegex = /\r?\n/;

type Priorities = { regex: RegExp; weight: number }[];

/**
 * check for MacOS default app paths first to avoid waiting for the slow lsregister command
 */
export function darwinFast(): string | undefined {
  const priorityOptions: (string | undefined)[] = [
    process.env.EDGE_PATH,
    process.env.LIGHTHOUSE_CHROMIUM_PATH,
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  for (const edgePath of priorityOptions) {
    if (edgePath && canAccess(edgePath)) return edgePath;
  }

  return darwin()[0];
}

export function darwin() {
  const suffixes = ["/Contents/MacOS/Google Edge"];

  const LSREGISTER =
    "/System/Library/Frameworks/CoreServices.framework" +
    "/Versions/A/Frameworks/LaunchServices.framework" +
    "/Versions/A/Support/lsregister";

  const installations: string[] = [];

  const customEdgePath = resolveEdgePath();
  if (customEdgePath) {
    installations.push(customEdgePath);
  }

  execSync(
    `${LSREGISTER} -dump` +
      " | grep -i 'microsoft edge\\?\\.app'" +
      " | awk '{$1=\"\"; print $0}'"
  )
    .toString()
    .split(newLineRegex)
    .forEach((inst: string) => {
      suffixes.forEach((suffix) => {
        const execPath = path.join(
          inst.substring(0, inst.indexOf(".app") + 4).trim(),
          suffix
        );
        if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
          installations.push(execPath);
        }
      });
    });

  // Retains one per line to maintain readability.
  // clang-format off
  const home = escapeRegExp(process.env.HOME || homedir());
  const priorities: Priorities = [
    { regex: new RegExp(`^${home}/Applications/.*Edge\\.app`), weight: 50 },
    { regex: /^\/Applications\/.*Edge.app/, weight: 100 },
    { regex: /^\/Volumes\/.*Edge.app/, weight: -2 },
  ];

  if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
    priorities.unshift({
      regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)),
      weight: 150,
    });
  }

  if (process.env.EDGE_PATH) {
    priorities.unshift({
      regex: new RegExp(escapeRegExp(process.env.EDGE_PATH)),
      weight: 151,
    });
  }

  // clang-format on
  return sort(installations, priorities);
}

function resolveEdgePath() {
  if (canAccess(process.env.EDGE_PATH)) {
    return process.env.EDGE_PATH;
  }

  if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
    log.warn(
      "EdgeLauncher",
      "LIGHTHOUSE_CHROMIUM_PATH is deprecated, use EDGE_PATH env variable instead."
    );
    return process.env.LIGHTHOUSE_CHROMIUM_PATH;
  }

  return undefined;
}

/**
 * Look for linux executables in 3 ways
 * 1. Look into EDGE_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for microsoft-edge-stable & microsoft-edge executables by using the which command
 */
export function linux() {
  let installations: string[] = [];

  // 1. Look into EDGE_PATH env variable
  const customEdgePath = resolveEdgePath();
  if (customEdgePath) {
    installations.push(customEdgePath);
  }

  // 2. Look into the directories where .desktop are saved on gnome based distro's
  const desktopInstallationFolders = [
    path.join(homedir(), ".local/share/applications/"),
    "/usr/share/applications/",
  ];
  desktopInstallationFolders.forEach((folder) => {
    installations = installations.concat(findEdgeExecutables(folder));
  });

  // Look for microsoft-edge(-stable) & chromium(-browser) executables by using the which command
  const executables = [
    "microsoft-edge-stable",
    "microsoft-edge",
    "chromium-browser",
    "chromium",
  ];
  executables.forEach((executable: string) => {
    try {
      const edgePath = execFileSync("which", [executable], { stdio: "pipe" })
        .toString()
        .split(newLineRegex)[0];

      if (canAccess(edgePath)) {
        installations.push(edgePath);
      }
    } catch (e) {
      // Not installed.
    }
  });

  if (!installations.length) {
    throw new EdgePathNotSetError();
  }

  const priorities: Priorities = [
    { regex: /edge-wrapper$/, weight: 51 },
    { regex: /microsoft-edge-stable$/, weight: 50 },
    { regex: /microsoft-edge$/, weight: 49 },
    { regex: /edge-browser$/, weight: 48 },
    { regex: /edge$/, weight: 47 },
  ];

  if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
    priorities.unshift({
      regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)),
      weight: 100,
    });
  }

  if (process.env.EDGE_PATH) {
    priorities.unshift({
      regex: new RegExp(escapeRegExp(process.env.EDGE_PATH)),
      weight: 101,
    });
  }

  return sort(uniq(installations.filter(Boolean)), priorities);
}

export function wsl() {
  // Manually populate the environment variables assuming it's the default config
  process.env.LOCALAPPDATA = getLocalAppDataPath(`${process.env.PATH}`);
  process.env.PROGRAMFILES = "/mnt/c/Program Files";
  process.env["PROGRAMFILES(X86)"] = "/mnt/c/Program Files (x86)";

  return win32();
}

export function win32() {
  const installations: string[] = [];
  const suffixes = [
    `${path.sep}Microsoft${path.sep}Edge SxS${path.sep}Application${path.sep}msedge.exe`,
    `${path.sep}Microsoft${path.sep}Edge${path.sep}Application${path.sep}msedge.exe`,
  ];
  const prefixes = [
    process.env.LOCALAPPDATA,
    process.env.PROGRAMFILES,
    process.env["PROGRAMFILES(X86)"],
  ].filter(Boolean) as string[];

  const customEdgePath = resolveEdgePath();
  if (customEdgePath) {
    installations.push(customEdgePath);
  }

  prefixes.forEach((prefix) =>
    suffixes.forEach((suffix) => {
      const edgePath = path.join(prefix, suffix);
      if (canAccess(edgePath)) {
        installations.push(edgePath);
      }
    })
  );
  return installations;
}

function sort(installations: string[], priorities: Priorities) {
  const defaultPriority = 10;
  return (
    installations
      // assign priorities
      .map((inst: string) => {
        for (const pair of priorities) {
          if (pair.regex.test(inst)) {
            return { path: inst, weight: pair.weight };
          }
        }
        return { path: inst, weight: defaultPriority };
      })
      // sort based on priorities
      .sort((a, b) => b.weight - a.weight)
      // remove priority flag
      .map((pair) => pair.path)
  );
}

function canAccess(file: string | undefined): boolean {
  if (!file) {
    return false;
  }

  try {
    fs.accessSync(file);
    return true;
  } catch (e) {
    return false;
  }
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function findEdgeExecutables(folder: string): string[] {
  const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
  const edgeExecRegex = "^Exec=/.*/(microsoft-edge|edge)-.*";

  const installations: string[] = [];
  if (canAccess(folder)) {
    // Output of the grep & print looks like:
    //    /opt/google/edge/microsoft-edge --profile-directory
    //    /home/user/Downloads/edge-linux/edge-wrapper %U
    let execPaths;

    // Some systems do not support grep -R so fallback to -r.
    // See https://github.com/GoogleChrome/chrome-launcher/issues/46 for more context.
    try {
      execPaths = execSync(
        `grep -ER "${edgeExecRegex}" ${folder} | awk -F '=' '{print $2}'`,
        { stdio: "pipe" }
      );
    } catch (e) {
      execPaths = execSync(
        `grep -Er "${edgeExecRegex}" ${folder} | awk -F '=' '{print $2}'`,
        { stdio: "pipe" }
      );
    }

    execPaths = execPaths
      .toString()
      .split(newLineRegex)
      .map((execPath: string) => execPath.replace(argumentsRegex, "$1"));

    execPaths.forEach(
      (execPath: string) => canAccess(execPath) && installations.push(execPath)
    );
  }

  return installations;
}
