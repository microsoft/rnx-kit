//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

/**
 * @typedef {{
 *   auth?: string;
 *   fail?: boolean;
 *   message?: string;
 *   fs?: typeof import("node:fs");
 *   azdev?: typeof import("azure-devops-node-api");
 *   octokit?: typeof import("@octokit/core");
 * }} Options
 */

/**
 * Returns the appropriate client for the provided access token.
 */
async function getClient() {
  const { AZURE_PERSONAL_ACCESS_TOKEN, GITHUB_TOKEN } = process.env;

  if (AZURE_PERSONAL_ACCESS_TOKEN) {
    return import("./AzureDevOpsClient.js");
  }

  if (GITHUB_TOKEN) {
    return import("./GitHubClient.js");
  }

  throw new Error("No access token was set");
}

/**
 * Submits a code review with suggestions with specified diff.
 * @param {string} diff
 * @param {Options=} options
 * @returns {Promise<void>}
 */
export default async function suggest(diff, options = {}) {
  const { makeReview } = await getClient();
  try {
    await makeReview(diff, {
      ...options,
      message:
        options.message ||
        "Changes were made (e.g. by formatters, linters, etc.) in the following files:",
    });
  } catch {
    process.exit(1);
  }
}
