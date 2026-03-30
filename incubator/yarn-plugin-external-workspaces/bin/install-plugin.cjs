#!/usr/bin/env node

const { execSync } = require("child_process");
const { join, dirname } = require("path");
const { existsSync } = require("fs");

function getPluginPath() {
  // open the package.json file and get the entry for main
  const { main } = require("../package.json");
  const rootPath = dirname(require.resolve("../package.json"));
  return join(rootPath, main);
}

function installPlugin() {
  const pluginPath = getPluginPath();
  if (!existsSync(pluginPath)) {
    throw new Error(`Plugin not found at ${pluginPath}`);
  }
  const command = `yarn plugin import ${pluginPath}`;
  execSync(command, { stdio: "inherit" });
}

// Execute the installation
installPlugin();
