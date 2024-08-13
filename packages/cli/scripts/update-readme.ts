#!/usr/bin/env node --import tsx

import { markdownTable } from "markdown-table";
import * as fs from "node:fs";
import { reactNativeConfig } from "../src/index.js";

const README = "README.md";
const UTF8 = { encoding: "utf-8" as const };

const readme = fs.readFileSync(README, UTF8);
const updatedReadme = reactNativeConfig.commands.reduce(
  (readme, { name, options }) => {
    if (!options) {
      return readme;
    }

    const table = markdownTable([
      ["Option", "Description"],
      ...options.map(({ name, description }) => {
        const flag = name
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("|", "&verbar;");
        return [flag, description];
      }),
    ]);

    const id = name.replace("rnx-", "@rnx-kit/cli/");
    const tokenStart = `<!-- ${id} start -->`;
    const tokenEnd = `<!-- ${id} end -->`;
    return readme.replace(
      new RegExp(`${tokenStart}([^]+)${tokenEnd}`),
      `${tokenStart}\n\n${table}\n\n${tokenEnd}`
    );
  },
  readme
);

if (updatedReadme !== readme) {
  fs.writeFileSync(README, updatedReadme);
}
