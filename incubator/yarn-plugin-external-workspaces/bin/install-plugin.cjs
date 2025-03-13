#!/usr/bin/env node

const { execSync } = require("child_process");
const { join, dirname } = require("path");
const { existsSync } = require("fs");

function getPluginPath() {
  // open the package.json file and get the entry for main
  const packageJsonPath = join(__dirname, "../package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`Package.json not found at ${packageJsonPath}`);
  }
  const main = require(packageJsonPath).main;
  const rootPath = dirname(packageJsonPath);
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
