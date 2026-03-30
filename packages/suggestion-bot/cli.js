#!/usr/bin/env node

//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parseArgs } from "node:util";
import suggest from "./src/index.js";

function printHelp() {
  console.log(
    [
      `Usage: ${path.basename(process.argv[1])} [options] [diff | file]`,
      "",
      "Submit code reviews with suggestions based on your diffs",
      "",
      "Arguments:",
      "  diff | file            the diff or file containing diff to create suggestions from",
      "",
      "Options:",
      "  -h, --help             display this help message",
      "  -v, --version          display version number",
      "  -m, --message <msg>    use the specified message as the PR comment",
      "  -f, --fail             fail if comments could not be posted",
      "",
      "Examples:",
      "  # Submit current changes as suggestions",
      '  GITHUB_TOKEN=<secret> suggestion-bot "$(git diff)"',
      "",
      "  # Alternatively, pipe to suggestion-bot",
      "  # to avoid escape character issues",
      "  git diff | GITHUB_TOKEN=<secret> suggestion-bot",
      "",
      "If your CI is hosted by Azure DevOps, replace `GITHUB_TOKEN` with `AZURE_PERSONAL_ACCESS_TOKEN`.",
    ].join("\n")
  );
}

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
    },
    message: {
      type: "string",
      short: "m",
    },
    fail: {
      type: "boolean",
      short: "f",
    },
  },
  allowPositionals: true,
});

if (values.help) {
  printHelp();
} else if (values.version) {
  const p = fileURLToPath(new URL("package.json", import.meta.url));
  const manifest = fs.readFileSync(p, { encoding: "utf-8" });
  const { name, version } = JSON.parse(manifest);
  console.log(name, version);
} else {
  if (positionals.length > 0) {
    const diffOrFile = positionals[0];
    const diff = fs.existsSync(diffOrFile)
      ? fs.readFileSync(diffOrFile, { encoding: "utf-8" })
      : diffOrFile;
    suggest(diff, values);
  } else if (!process.stdin.isTTY) {
    let data = "";
    const stdin = process.openStdin();
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => (data += chunk));
    stdin.on("end", () => suggest(data, values));
  } else {
    process.exitCode = 1;
    printHelp();
  }
}
