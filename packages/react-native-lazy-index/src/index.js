// @ts-check
"use strict";

/**
 * @typedef {{
 *   type: "app" | "callable";
 *   moduleId: string;
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
    const { type, moduleId } = components[name];
    switch (type) {
      case "app":
        shouldImportAppRegistry = true;
        index.push(
          `AppRegistry.registerComponent("${name}", () => {`,
          `  require("${moduleId}");`,
          `  return AppRegistry.getRunnable("${name}").componentProvider();`,
          `});`
        );
        break;
      case "callable":
        shouldImportBatchedBridge = true;
        index.push(
          `BatchedBridge.registerLazyCallableModule("${name}", () => {`,
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

function readExperiencesFromManifest() {
  const fs = require("fs");
  const { resolveModule } = require("./module");

  const manifestPath = resolveModule("./package.json");
  const manifest = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const { experiences } = JSON.parse(manifest);

  if (!experiences) {
    throw new Error("Missing `experiences` section in `package.json`");
  }

  if (typeof experiences !== "object") {
    throw new Error("Invalid `experiences` section in `package.json`");
  }

  return experiences;
}

module.exports = (experiences = readExperiencesFromManifest()) => {
  const { parseExperiences } = require("./experiences");
  return generateIndex(parseExperiences(experiences));
};
