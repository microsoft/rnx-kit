// @ts-check
"use strict";

/**
 * @param {string} moduleId
 * @param {string=} projectRoot
 * @returns {string}
 */
function resolveModule(moduleId, projectRoot = process.cwd()) {
  return require.resolve(moduleId, { paths: [projectRoot] });
}

exports.resolveModule = resolveModule;
