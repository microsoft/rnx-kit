/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const path = require("path");

/**
 * @typedef {import("unified").Plugin} Plugin
 * @typedef {import("unified").PluginTuple} PluginTuple
 * @typedef {{attachers: (Plugin | PluginTuple)[]}} UnifiedProcessorContext
 *
 * Types for the Docusaurus MDX loader are in @docusaurus/mdx-loader, but they
 * are internal so we can't use them. Define a subset of what we need here.
 * @typedef {{filepath: string}} DocusaurusMdxLoaderOptions
 *
 * @typedef {{currentFile: string, currentDir: string}} DocusaurusMdxContext
 */

/**
 * Report an error by throwing an exception with the given message, along with
 * helpful, actionable information for the developer who sees the error.
 *
 * @param {string} message Error message
 * @returns {never} Never returns
 */
function error(message) {
  throw new Error(
    message +
      ". Did you recently update Docusaurus? This code may need to be updated as well."
  );
}

/**
 * Get information about the current MDX document being read by Docusaurus.
 *
 * @param {UnifiedProcessorContext} context Unified processor context
 * @returns {DocusaurusMdxContext} Docusaurus MDX context
 */
function getDocusaurusMdxContext(context) {
  // Read the MDX options that Docusaurus passes to @mdx-js/mdx. They are
  // always paired with the first unified plugin, which parses markdown text
  // into an MDAST.
  //
  // Probe carefully. This makes assumptions about Docusaurus and how it
  // uses unified.

  if (!context.attachers) {
    error("Failed to find the list of Unified plugins");
  }
  const attachers = context.attachers;

  if (
    !Array.isArray(context.attachers) ||
    attachers.length < 1 ||
    !attachers[0]
  ) {
    error("Failed to get the first Unified plugin");
  }
  const attacher = attachers[0];

  if (!Array.isArray(attacher) || attacher.length < 2 || !attacher[1]) {
    error("Failed to get options for the first Unified plugin");
  }
  /** @type {Partial<DocusaurusMdxLoaderOptions>} */
  const options = attacher[1];

  const currentFile = options.filepath;
  if (!currentFile) {
    error(
      "Failed to get the path of the current markdown file being processed. " +
        "This comes from the Docusaurus MDX loader context"
    );
  }
  const currentDir = path.dirname(currentFile);

  return {
    currentFile,
    currentDir,
  };
}
module.exports = getDocusaurusMdxContext;
