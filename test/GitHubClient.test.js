//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

import { deepEqual, equal, fail, match, rejects } from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { makeReview } from "../src/GitHubClient.js";
import {
  FIXTURE_PIPED_GH_PAYLOAD,
  FIXTURE_PIPED_WINDOWS,
  FIXTURE_PIPED,
  FIXTURE_UNIDIFF_GH_PAYLOAD,
  FIXTURE_UNIDIFF,
} from "./__fixtures__.js";

/**
 * @typedef {import("@octokit/core").OctokitOptions} OctokitOptions
 */
class Octokit {
  constructor(
    /** @type {OctokitOptions} */ {
      auth,
      createReview,
      request,
      setAuth,
    }
  ) {
    this.rest = { pulls: { createReview } };
    this.request = request;
    setAuth && setAuth(auth);
  }
}

/**
 * @param {Record<string, unknown>} mocks
 * @returns {{ auth: string }}
 */
function mock(mocks) {
  return {
    ...mocks,
    // @ts-expect-error For mocking purposes only
    fs: {
      readFileSync: () => '{ "pull_request": { "number": 0 } }',
    },
    octokit: {
      Octokit: {
        plugin: () => Octokit,
      },
    },
  };
}

/**
 * @typedef {{ mock: { calls: { arguments: string[] }[] }}} Mock
 * @param {unknown} obj
 * @returns {Mock["mock"]}
 */
function spy(obj) {
  return /** @type {Mock} */ (obj).mock;
}

describe("GitHubClient", () => {
  const { GITHUB_EVENT_PATH, GITHUB_REPOSITORY } = process.env;

  beforeEach(() => {
    const { env } = process;
    env["GITHUB_TOKEN"] = "auth-token";
    env["GITHUB_EVENT_PATH"] = "/github/workflow/event.json";
    env["GITHUB_REPOSITORY"] = "tido64/suggestion-bot";
  });

  after(() => {
    const { env } = process;
    env["GITHUB_EVENT_PATH"] = GITHUB_EVENT_PATH;
    env["GITHUB_REPOSITORY"] = GITHUB_REPOSITORY;
  });

  it("rejects if `GITHUB_EVENT_PATH` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["GITHUB_EVENT_PATH"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`GITHUB_EVENT_PATH` should've been defined by GitHub Actions"
      );
      return true;
    });
  });

  it("rejects if `GITHUB_REPOSITORY` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["GITHUB_REPOSITORY"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`GITHUB_REPOSITORY` should've been defined by GitHub Actions"
      );
      return true;
    });
  });

  it("rejects if `GITHUB_TOKEN` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["GITHUB_TOKEN"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`GITHUB_TOKEN` must be set to your GitHub access token"
      );
      return true;
    });
  });

  it("rejects if multiple environment variables are missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["GITHUB_EVENT_PATH"];
    delete process.env["GITHUB_REPOSITORY"];
    delete process.env["GITHUB_TOKEN"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`GITHUB_TOKEN` must be set to your GitHub access token"
      );
      equal(
        spy(console.error).calls[1].arguments[0],
        "`GITHUB_EVENT_PATH` should've been defined by GitHub Actions"
      );
      equal(
        spy(console.error).calls[2].arguments[0],
        "`GITHUB_REPOSITORY` should've been defined by GitHub Actions"
      );
      return true;
    });
  });

  it("fetches auth token from environment variable", async () => {
    let auth = "";
    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createReview: () => Promise.resolve(),
        setAuth: (/** @type {string} */ token) => {
          auth = token;
        },
      })
    );

    equal(auth, process.env["GITHUB_TOKEN"]);
  });

  it("skips invalid diffs", async () => {
    let payload = undefined;
    const mocks = mock({
      createReview: (/** @type {{}} */ review) => {
        payload = review;
        return Promise.resolve();
      },
    });

    await makeReview("", mocks);
    equal(payload, undefined);

    await makeReview(
      "diff --git a/src/Graphics/TextureAllocator.gl.h b/src/Graphics/TextureAllocator.gl.h",
      mocks
    );
    equal(payload, undefined);
  });

  it("supports unified diffs", async () => {
    let payload = undefined;
    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createReview: (/** @type {{}} */ review) => {
          payload = review;
          return Promise.resolve();
        },
      })
    );

    deepEqual(payload, FIXTURE_UNIDIFF_GH_PAYLOAD);
  });

  it("supports piped diffs", async () => {
    let payload = undefined;
    const mocks = mock({
      createReview: (/** @type {{}} */ review) => {
        payload = review;
        return Promise.resolve();
      },
    });

    await makeReview(FIXTURE_PIPED, mocks);
    deepEqual(payload, FIXTURE_PIPED_GH_PAYLOAD);

    await makeReview(FIXTURE_PIPED_WINDOWS, mocks);
    deepEqual(payload, FIXTURE_PIPED_GH_PAYLOAD);
  });

  it("dumps the payload on failure", async (t) => {
    t.mock.method(console, "dir", () => null);
    t.mock.method(console, "error", () => null);

    await makeReview(
      FIXTURE_UNIDIFF,
      mock({ createReview: () => Promise.reject("HttpError") })
    );

    equal(spy(console.error).calls[0].arguments[0], "HttpError");
    deepEqual(
      spy(console.dir).calls[0].arguments[0],
      FIXTURE_UNIDIFF_GH_PAYLOAD
    );
  });

  it("retries with a comment when getting an error due to suggestions to unchanged files", async (t) => {
    t.mock.method(console, "error", () => null);

    const message = "Changes were made in the following files:";
    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        message,
        createReview: () => Promise.reject({ name: "HttpError", status: 422 }),
        /** @type {(url: string, request: Record<string, unknown>) => Promise<void>} */
        request: (url, request) => {
          match(url, /\/issues\/0\/comments/);
          equal(typeof request, "object");
          if (typeof request.body !== "string") {
            fail("Expected `body` to be a string");
          }
          match(request.body, new RegExp(message));
          return Promise.resolve();
        },
      })
    );

    equal(spy(console.error).calls.length, 0);
  });

  it("retries with a comment when getting a server internal error", async (t) => {
    t.mock.method(console, "error", () => null);

    const message = "Changes were made in the following files:";
    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        message,
        createReview: () => Promise.reject({ name: "HttpError", status: 500 }),
        /** @type {(url: string, request: Record<string, unknown>) => Promise<void>} */
        request: (url, request) => {
          match(url, /\/issues\/0\/comments/);
          equal(typeof request, "object");
          if (typeof request.body !== "string") {
            fail("Expected `body` to be a string");
          }
          match(request.body, new RegExp(message));
          return Promise.resolve();
        },
      })
    );

    equal(spy(console.error).calls.length, 0);
  });

  it("dumps the payload when retry with comment fails", async (t) => {
    t.mock.method(console, "error", () => null);
    t.mock.method(console, "dir", () => null);

    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createReview: () => Promise.reject({ name: "HttpError", status: 422 }),
        request: () => Promise.reject("HttpError"),
      })
    );

    equal(spy(console.error).calls[0].arguments[0], "HttpError");
    deepEqual(
      spy(console.dir).calls[0].arguments[0],
      FIXTURE_UNIDIFF_GH_PAYLOAD
    );
  });

  it("throw on failure", async (t) => {
    t.mock.method(console, "error", () => null);
    t.mock.method(console, "dir", () => null);

    const task = makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createReview: () => Promise.reject("HttpError"),
        fail: true,
      })
    );

    await rejects(task, (err) => {
      equal(err, "HttpError");
      return true;
    });

    equal(spy(console.error).calls[0].arguments[0], "HttpError");
    deepEqual(
      spy(console.dir).calls[0].arguments[0],
      FIXTURE_UNIDIFF_GH_PAYLOAD
    );
  });

  it("throws when retry with comment fails", async (t) => {
    t.mock.method(console, "error", () => null);
    t.mock.method(console, "dir", () => null);

    const task = makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createReview: () => Promise.reject({ name: "HttpError", status: 422 }),
        request: () => Promise.reject("HttpError"),
        fail: true,
      })
    );

    await rejects(task, (err) => {
      equal(err, "HttpError");
      return true;
    });

    equal(spy(console.error).calls[0].arguments[0], "HttpError");
    deepEqual(
      spy(console.dir).calls[0].arguments[0],
      FIXTURE_UNIDIFF_GH_PAYLOAD
    );
  });
});
