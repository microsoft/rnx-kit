// @ts-check
"use strict";

const { parseExperiences } = require("./experiences");
const { resolveModule } = require("./module");

/**
 * @typedef {{
 *   type: "app" | "callable";
 *   moduleId: string;
 *   source: string;
 * }} Component;
 */

/**
 * Generates the index file.
 * @param {Record<string, Component>} components
 * @returns {string}
 */
function generateIndex(components) {
  let shouldImportAppRegistry = false;
  let shouldImportBatchedBridge = false;

  const lines = Object.keys(components).reduce((index, name) => {
    const { type, moduleId, source } = components[name];
    const normalizedSourcePath = source.replace(/\\/g, "/");
    switch (type) {
      case "app":
        shouldImportAppRegistry = true;
        index.push(
          `AppRegistry.registerComponent("${name}", () => {`,
          `  // Source: ${normalizedSourcePath}`,
          `  require("${moduleId}");`,
          `  return AppRegistry.getRunnable("${name}").componentProvider();`,
          `});`
        );
        break;
      case "callable":
        shouldImportBatchedBridge = true;
        index.push(
          `BatchedBridge.registerLazyCallableModule("${name}", () => {`,
          `  // Source: ${normalizedSourcePath}`,
          `  require("${moduleId}");`,
          `  return BatchedBridge.getCallableModule("${name}");`,
          `});`
        );
        break;
      default:
        throw new Error(`Unknown component type: ${type}`);
    }
    return index;
  }, /** @type {string[]} */ ([]));

  if (shouldImportBatchedBridge) {
    lines.unshift(
      'const BatchedBridge = require("react-native/Libraries/BatchedBridge/BatchedBridge");'
    );
  }
  if (shouldImportAppRegistry) {
    lines.unshift('const { AppRegistry } = require("react-native");');
  }

  return lines.join("\n");
}

module.exports = () => {
  const fs = require("fs");

  const packageManifest = resolveModule("./package.json");
  const { experiences } = JSON.parse(fs.readFileSync(packageManifest, "utf-8"));

  return generateIndex(parseExperiences(experiences));
};
