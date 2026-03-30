//
// Copyright (c) Tommy Nguyen
//
// This source code is licensed under the MIT license found in the
// LICENSE file in the root directory of this source tree.
//
// @ts-check

import { deepEqual, equal, fail, rejects } from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { getItemPath, makeReview } from "../src/AzureDevOpsClient.js";
import {
  FIXTURE_PIPED,
  FIXTURE_PIPED_ADO_ITERATION_CHANGES,
  FIXTURE_PIPED_ADO_PAYLOAD,
  FIXTURE_PIPED_WINDOWS,
  FIXTURE_UNIDIFF,
  FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES,
  FIXTURE_UNIDIFF_ADO_PAYLOAD,
} from "./__fixtures__.js";

/**
 * @typedef {import("azure-devops-node-api/GitApi.js").GitApi} GitApi
 * @typedef {import("azure-devops-node-api/interfaces/GitInterfaces.js").GitPullRequestCommentThread} GitPullRequestCommentThread
 * @typedef {import("azure-devops-node-api/interfaces/common/VsoBaseInterfaces.js").IRequestHandler} IRequestHandler
 * @typedef {import("azure-devops-node-api/interfaces/common/VsoBaseInterfaces.js").IRequestOptions} IRequestOptions
 * @typedef {Partial<GitApi> & {
 *   setAuthToken: (handler: IRequestHandler) => void;
 *   setServerUrl: (url: string) => void;
 * }} GitApiMock
 */

class WebApi {
  constructor(
    /** @type {string} */ serverUrl,
    /** @type {IRequestHandler} */ authHandler,
    /** @type {GitApiMock} */ {
      createThread,
      getPullRequestIterationChanges,
      getPullRequestIterations,
      setAuthToken,
      setServerUrl,
    }
  ) {
    this._getPullRequestIterationChanges = getPullRequestIterationChanges;
    this._getPullRequestIterations = getPullRequestIterations;
    this.createThread = createThread;
    setAuthToken && setAuthToken(authHandler);
    setServerUrl && setServerUrl(serverUrl);
  }

  connect() {
    return Promise.resolve();
  }

  getGitApi() {
    return this;
  }

  /** @type {GitApi["getPullRequestIterationChanges"]} */
  getPullRequestIterationChanges(repositoryId, pullRequestId, iterationId) {
    if (!this._getPullRequestIterationChanges) {
      // @ts-expect-error For mocking purposes only
      return Promise.resolve([1]);
    }

    return this._getPullRequestIterationChanges(
      repositoryId,
      pullRequestId,
      iterationId
    );
  }

  /** @type {GitApi["getPullRequestIterations"]} */
  getPullRequestIterations(
    repositoryId,
    pullRequestId,
    project,
    includeCommits
  ) {
    return this._getPullRequestIterations
      ? this._getPullRequestIterations(
          repositoryId,
          pullRequestId,
          project,
          includeCommits
        )
      : Promise.resolve([{ id: 1 }]);
  }
}

/**
 * @param {{}} mocks
 * @returns {import("../src/AzureDevOpsClient.js").RequestOptions}
 */
function mock(mocks) {
  return {
    ...mocks,
    azdev: {
      // @ts-expect-error For mocking purposes only
      getPersonalAccessTokenHandler: (authToken) => authToken,
      // @ts-expect-error For mocking purposes only
      WebApi,
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

describe("AzureDevOpsClient", () => {
  const {
    AZURE_PERSONAL_ACCESS_TOKEN: ACCESS_TOKEN,
    BUILD_REPOSITORY_ID: REPOSITORY_ID,
    SYSTEM_PULLREQUEST_PULLREQUESTID: PULL_REQUEST_ID,
    SYSTEM_TEAMFOUNDATIONCOLLECTIONURI: SERVER_URL,
    SYSTEM_TEAMPROJECTID: PROJECT_ID,
  } = process.env;

  beforeEach(() => {
    const { env } = process;
    env["AZURE_PERSONAL_ACCESS_TOKEN"] = "access-token";
    env["BUILD_REPOSITORY_ID"] = "suggestion-bot";
    env["SYSTEM_PULLREQUEST_PULLREQUESTID"] = "13";
    env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"] =
      "https://dev.azure.com/fabrikamfiber";
    env["SYSTEM_TEAMPROJECTID"] = "tido64";
  });

  after(() => {
    const { env } = process;
    env["AZURE_PERSONAL_ACCESS_TOKEN"] = ACCESS_TOKEN;
    env["BUILD_REPOSITORY_ID"] = REPOSITORY_ID;
    env["SYSTEM_PULLREQUEST_PULLREQUESTID"] = PULL_REQUEST_ID;
    env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"] = SERVER_URL;
    env["SYSTEM_TEAMPROJECTID"] = PROJECT_ID;
  });

  it("rejects if `AZURE_PERSONAL_ACCESS_TOKEN` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["AZURE_PERSONAL_ACCESS_TOKEN"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`AZURE_PERSONAL_ACCESS_TOKEN` must be set to your Azure DevOps access token"
      );
      return true;
    });
  });

  it("rejects if `BUILD_REPOSITORY_ID` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["BUILD_REPOSITORY_ID"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`BUILD_REPOSITORY_ID` should've been defined by Azure Pipelines"
      );
      return true;
    });
  });

  it("rejects if `SYSTEM_PULLREQUEST_PULLREQUESTID` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["SYSTEM_PULLREQUEST_PULLREQUESTID"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`SYSTEM_PULLREQUEST_PULLREQUESTID` should've been defined by Azure Pipelines"
      );
      return true;
    });
  });

  it("rejects if `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`SYSTEM_TEAMFOUNDATIONCOLLECTIONURI` should've been defined by Azure Pipelines"
      );
      return true;
    });
  });

  it("rejects if `SYSTEM_TEAMPROJECTID` is missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["SYSTEM_TEAMPROJECTID"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`SYSTEM_TEAMPROJECTID` should've been defined by Azure Pipelines"
      );
      return true;
    });
  });

  it("rejects if multiple environment variables are missing", async (t) => {
    t.mock.method(console, "error", () => null);

    delete process.env["AZURE_PERSONAL_ACCESS_TOKEN"];
    delete process.env["BUILD_REPOSITORY_ID"];
    delete process.env["SYSTEM_PULLREQUEST_PULLREQUESTID"];
    delete process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"];
    delete process.env["SYSTEM_TEAMPROJECTID"];

    await rejects(makeReview(""), (err) => {
      if (!(err instanceof Error)) {
        fail("Expected an Error");
      }
      equal(err.message, "One or several environment variables are missing");
      equal(
        spy(console.error).calls[0].arguments[0],
        "`AZURE_PERSONAL_ACCESS_TOKEN` must be set to your Azure DevOps access token"
      );
      equal(
        spy(console.error).calls[1].arguments[0],
        "`BUILD_REPOSITORY_ID` should've been defined by Azure Pipelines"
      );
      equal(
        spy(console.error).calls[2].arguments[0],
        "`SYSTEM_PULLREQUEST_PULLREQUESTID` should've been defined by Azure Pipelines"
      );
      equal(
        spy(console.error).calls[3].arguments[0],
        "`SYSTEM_TEAMFOUNDATIONCOLLECTIONURI` should've been defined by Azure Pipelines"
      );
      equal(
        spy(console.error).calls[4].arguments[0],
        "`SYSTEM_TEAMPROJECTID` should've been defined by Azure Pipelines"
      );
      return true;
    });
  });

  it("fetches environment variables", async () => {
    let azureAccessToken = "";
    let buildRepositoryId = "";
    let prPullRequestId = "";
    let projectId = "";
    let tfCollectionUri = "";

    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createThread: () => Promise.resolve(),
        getPullRequestIterationChanges: () =>
          Promise.resolve(FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES),
        getPullRequestIterations: (
          /** @type {string} */ repositoryId,
          /** @type {string} */ pullRequestId,
          /** @type {string} */ project
        ) => {
          buildRepositoryId = repositoryId;
          prPullRequestId = pullRequestId;
          projectId = project;
          return Promise.resolve([{ id: 1 }]);
        },
        setAuthToken: (/** @type {string} */ authToken) => {
          azureAccessToken = authToken;
        },
        setServerUrl: (/** @type {string} */ serverUrl) => {
          tfCollectionUri = serverUrl;
        },
      })
    );

    const {
      AZURE_PERSONAL_ACCESS_TOKEN,
      BUILD_REPOSITORY_ID,
      SYSTEM_PULLREQUEST_PULLREQUESTID,
      SYSTEM_TEAMPROJECTID,
      SYSTEM_TEAMFOUNDATIONCOLLECTIONURI,
    } = process.env;
    equal(azureAccessToken, AZURE_PERSONAL_ACCESS_TOKEN);
    equal(buildRepositoryId, BUILD_REPOSITORY_ID);
    equal(prPullRequestId, Number(SYSTEM_PULLREQUEST_PULLREQUESTID || ""));
    equal(projectId, SYSTEM_TEAMPROJECTID);
    equal(tfCollectionUri, SYSTEM_TEAMFOUNDATIONCOLLECTIONURI);
  });

  it("skips invalid diffs", async () => {
    let payload = undefined;
    const mocks = mock({
      createThread: (/** @type {GitPullRequestCommentThread} */ review) => {
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
    /** @type {GitPullRequestCommentThread[]} */
    const payloads = [];
    const mocks = mock({
      createThread: (/** @type {GitPullRequestCommentThread} */ review) => {
        payloads.push(review);
        return Promise.resolve();
      },
      getPullRequestIterationChanges: () =>
        Promise.resolve(FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES),
    });
    await makeReview(FIXTURE_UNIDIFF, mocks);
    deepEqual(payloads, FIXTURE_UNIDIFF_ADO_PAYLOAD);
  });

  it("supports piped diffs", async () => {
    /** @type {GitPullRequestCommentThread[]} */
    let payload = [];
    const mocks = mock({
      createThread: (/** @type {GitPullRequestCommentThread} */ review) => {
        payload.push(review);
        return Promise.resolve();
      },
      getPullRequestIterationChanges: () =>
        Promise.resolve(FIXTURE_PIPED_ADO_ITERATION_CHANGES),
    });

    await makeReview(FIXTURE_PIPED, mocks);
    deepEqual(payload, FIXTURE_PIPED_ADO_PAYLOAD);

    payload = [];

    await makeReview(FIXTURE_PIPED_WINDOWS, mocks);
    deepEqual(payload, FIXTURE_PIPED_ADO_PAYLOAD);
  });

  it("ignores files not in latest iteration", async () => {
    /** @type {GitPullRequestCommentThread[]} */
    const payloads = [];
    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createThread: (/** @type {GitPullRequestCommentThread} */ review) => {
          payloads.push(review);
          return Promise.resolve();
        },
        getPullRequestIterationChanges: () => Promise.resolve({}),
      })
    );
    equal(payloads.length, 0);
  });

  it("dumps the exception on failure", async (t) => {
    t.mock.method(console, "error", () => null);

    await makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createThread: () => Promise.reject("test"),
        getPullRequestIterationChanges: () =>
          Promise.resolve(FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES),
      })
    );

    equal(spy(console.error).calls[0].arguments[0], "test");
  });

  it("throws on failure", async (t) => {
    t.mock.method(console, "error", () => null);

    const task = makeReview(
      FIXTURE_UNIDIFF,
      mock({
        createThread: () => Promise.reject("test"),
        getPullRequestIterationChanges: () =>
          Promise.resolve(FIXTURE_UNIDIFF_ADO_ITERATION_CHANGES),
        fail: true,
      })
    );

    await rejects(task, (err) => {
      equal(err, "test");
      return true;
    });
  });
});

describe("getItemPath", () => {
  it("returns `undefined` when missing item path", () => {
    equal(getItemPath({}), undefined);
    equal(getItemPath({ item: {} }), undefined);
    equal(getItemPath({ item: { path: "" } }), undefined);
  });

  it("trims leading '/' from item path", () => {
    equal(
      getItemPath({ item: { path: "test/AzureDevOpsClient.test.js" } }),
      "test/AzureDevOpsClient.test.js"
    );
    equal(
      getItemPath({ item: { path: "/test/AzureDevOpsClient.test.js" } }),
      "test/AzureDevOpsClient.test.js"
    );
    equal(
      getItemPath({ item: { path: "//test/AzureDevOpsClient.test.js" } }),
      "/test/AzureDevOpsClient.test.js"
    );
  });
});
