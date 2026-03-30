// @ts-check
import * as octokit_core from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import * as nodefs from "node:fs";
import { c } from "./helpers.js";
import { makeComments } from "./makeComments.js";

/** @typedef {import("./index.js").Options} Options */

/**
 * Returns the pull request number of the current build.
 * @param {string} eventPath Path of the file with the complete webhook event payload.
 * @param {Options} options
 * @returns {number}
 */
function getPullRequestNumber(eventPath, { fs = nodefs }) {
  const e = JSON.parse(fs.readFileSync(eventPath, { encoding: "utf-8" }));
  return e.pull_request.number;
}

/**
 * Creates an Octokit instance.
 * @param {Options} options
 */
function makeOctokit({ octokit = octokit_core, ...options }) {
  const { Octokit } = octokit;
  const RestClient = Octokit.plugin(restEndpointMethods);
  return new RestClient(options);
}

/**
 * Trims comment for fields not defined in DraftPullRequestReviewThread.
 *
 * GitHub type checks the payload sent to it and fails the request if there are
 * unknown fields.
 *
 * @param {import("./makeComments.js").Comment} comment
 * @returns {Omit<import("./makeComments.js").Comment, "line_length">}
 */
function trimComment({ line_length, ...rest }) {
  return rest;
}

/**
 * Submits a code review with suggestions with specified diff and options.
 * @param {string} diff
 * @param {Options} options
 * @returns {Promise<unknown>}
 */
export function makeReview(diff, { fail, message, ...options } = {}) {
  const { GITHUB_EVENT_PATH, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_TOKEN } =
    process.env;
  if (!GITHUB_EVENT_PATH || !GITHUB_REPOSITORY || !GITHUB_TOKEN) {
    if (!GITHUB_TOKEN) {
      console.error("`GITHUB_TOKEN` must be set to your GitHub access token");
    }
    if (!GITHUB_EVENT_PATH) {
      console.error(
        "`GITHUB_EVENT_PATH` should've been defined by GitHub Actions"
      );
    }
    if (!GITHUB_REPOSITORY) {
      console.error(
        "`GITHUB_REPOSITORY` should've been defined by GitHub Actions"
      );
    }
    return Promise.reject(
      new Error("One or several environment variables are missing")
    );
  }

  const comments = makeComments(diff);
  if (comments.length === 0) {
    return Promise.resolve();
  }

  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  const pullRequestNumber = getPullRequestNumber(GITHUB_EVENT_PATH, options);
  const review = {
    accept: "application/vnd.github.comfort-fade-preview+json",
    owner,
    repo,
    pull_number: pullRequestNumber,
    event: c("COMMENT"),
    comments: comments.map(trimComment),
  };
  const octokit = makeOctokit({ auth: GITHUB_TOKEN, ...options });
  return new Promise((resolve, reject) => {
    octokit.rest.pulls
      .createReview(review)
      .then(resolve)
      .catch((e) => {
        // We'll get a 422 if we tried to post review comments to files that
        // weren't changed in the PR. Retry with a normal comment instead.
        if (e.name === "HttpError" && (e.status === 422 || e.status === 500)) {
          octokit
            .request(
              `POST /repos/${owner}/${repo}/issues/${pullRequestNumber}/comments`,
              {
                owner,
                repo,
                issue_number: pullRequestNumber,
                body: [
                  message,
                  "",
                  ...comments.map(({ path, line, start_line }) => {
                    const lines =
                      typeof start_line === "number"
                        ? `${start_line}-L${line}`
                        : line;
                    return `- https://github.com/${owner}/${repo}/blob/${GITHUB_SHA}/${path}#L${lines}`;
                  }),
                ].join("\n"),
              }
            )
            .then(resolve)
            .catch((e) => {
              console.error(e);
              console.dir(review, { depth: null });
              if (fail) {
                reject(e);
              } else {
                resolve(e);
              }
            });
        } else {
          console.error(e);
          console.dir(review, { depth: null });
          if (fail) {
            reject(e);
          } else {
            resolve(e);
          }
        }
      });
  });
}
