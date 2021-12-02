#!/usr/bin/env node
// @ts-check
"use strict";

const { spawnSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");

const CHANGESETS_CONFIG = ".changeset/config.json";

const config = readFileSync(CHANGESETS_CONFIG, { encoding: "utf-8" });

/**
 * This is a workaround for `changeset version` adding `[skip ci]` to the
 * commit message of the release PR, making it too easy to merge and skip
 * publishing on CI.
 *
 * Changesets wants us to set `commit` to `false` if we don't want this
 * behaviour, but that means that we would have to manually `git add` and
 * `git commit` the change files that were generated.
 *
 * The `commit` option used to be separate for `add` and `version`, but
 * Changesets merged the two back in 2.0. An issue has been opened to get the
 * separate options back: https://github.com/atlassian/changesets/issues/688
 *
 * This workaround should go away once it has been resolved.
 */
const modifiedConfig = {
  ...JSON.parse(config),
  commit: false,
};

writeFileSync(CHANGESETS_CONFIG, JSON.stringify(modifiedConfig));

spawnSync("yarn", ["changeset", "version"], { stdio: "inherit" });

writeFileSync(CHANGESETS_CONFIG, config);
