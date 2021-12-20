import https from "https";
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import path from "path";
import deepmerge from "deepmerge";

import {
  CHANGES_TEMPLATE,
  git,
  run,
  getAllChangelogDescriptions,
  getOffsetBaseCommit,
  getOriginalCommit,
  getFirstCommitAfterForkingFromMain,
  Changes,
  PlatformChanges,
} from "../src/generator";

if (!process.env.RN_REPO) {
  throw new Error(
    "[!] Specify the path to a checkout of the react-native repo with the `RN_REPO` env variable."
  );
}
const RN_REPO = path.join(process.env.RN_REPO, ".git");

console.warn = () => {};
console.error = () => {};

function requestWithFixtureResponse(fixture: string) {
  const requestEmitter = new EventEmitter();
  const responseEmitter = new EventEmitter();
  (responseEmitter as any).statusCode = 200;
  (responseEmitter as any).headers = { link: 'rel="next"' };
  setImmediate(() => {
    requestEmitter.emit("response", responseEmitter);
    fs.readFile(path.join(__dirname, "__fixtures__", fixture), "utf-8").then(
      (data) => {
        responseEmitter.emit("data", data);
        responseEmitter.emit("end");
      }
    );
  });
  return requestEmitter;
}

describe(getOriginalCommit, () => {
  it("returns a cherry-picked community commit with the `sha` updated to point to the original in the `main` branch", () => {
    return getOriginalCommit(RN_REPO, {
      sha: "474861f4e7aa0c5314081444edaee48d2faea1b6",
      commit: {
        message:
          "A community picked commit\n\nDifferential Revision: D17285473",
      },
      author: { login: "janicduplessis" },
    }).then((commit) => {
      expect(commit).toEqual({
        sha: "2c1913f0b3d12147654501f7ee43af1d313655d8",
        commit: {
          message:
            "A community picked commit\n\nDifferential Revision: D17285473",
        },
        author: { login: "janicduplessis" },
      });
    });
  });
});

describe(getFirstCommitAfterForkingFromMain, () => {
  it("returns the SHA of the first commit where its first parent is on the main branch", () => {
    return getFirstCommitAfterForkingFromMain(RN_REPO, "v0.61.5").then(
      (sha) => {
        expect(sha).toEqual("bb625e523867d3b8391a76e5aa7c22c081036835");
      }
    );
  });
});

describe(getOffsetBaseCommit, () => {
  it("returns the first commit after forking from `main` when that is not the same as the one for `compare`", () => {
    return getOffsetBaseCommit(RN_REPO, "v0.60.5", "v0.61.0").then((sha) => {
      expect(sha).toEqual("9cd88251a3051dc1f3f9348a4395f0baae56f5b5");
    });
  });

  it("returns the resolved input base commit, if both `base` and `compare` resolve to the same first commit after forking from `main`", () => {
    return getOffsetBaseCommit(RN_REPO, "v0.60.5", "v0.60.6").then((sha) => {
      expect(sha).toEqual("35300147ca66677f42e8544264be72ac0e9d1b45");
    });
  });
});

describe("functions that hit GitHub's commits API", () => {
  // The 2nd to last commit in commits-v0.60.5-page-2.json, which is the 59th commit.
  const base = "53e32a47e4062f428f8d714333236cedbe05b482";
  // The first commit in commits-v0.60.5-page-1.json, which is the last chronologically as the
  // GH API returns commits in DESC order.
  const compare = "35300147ca66677f42e8544264be72ac0e9d1b45";

  beforeAll(() => {
    const getMock = jest.fn((uri) => {
      if (
        uri.path ===
        `/repos/facebook/react-native/commits?sha=${compare}&page=1`
      ) {
        return requestWithFixtureResponse("commits-v0.60.5-page-1.json");
      } else if (
        uri.path ===
        `/repos/facebook/react-native/commits?sha=${compare}&page=2`
      ) {
        return requestWithFixtureResponse("commits-v0.60.5-page-2.json");
      } else {
        throw new Error(`Unexpected request: ${uri.path}`);
      }
    });
    Object.defineProperty(https, "get", { value: getMock });
  });

  describe(run, () => {
    it("fetches commits, filters them, and generates markdown", () => {
      return run({
        base,
        compare,
        token: "authn-token",
        gitDir: RN_REPO,
        maxWorkers: 10,
        existingChangelogData:
          "- Bla bla bla ([ffdf3f2](https://github.com/facebook/react-native/commit/ffdf3f2)",
      }).then((changelog) => {
        expect(changelog).toMatchSnapshot();
      });
    });
  });
});

function getCommitMessage(sha: string) {
  return git(RN_REPO, "log", "--format=%B", "-n", "1", sha);
}

type PartialChanges = { [K in keyof Changes]?: Partial<PlatformChanges> };

describe("commit resolving,formatting and attribution regression tests", () => {
  const cases: Array<[string, PartialChanges, boolean?]> = [
    [
      "d8fa1206c3fecd494b0f6abb63c66488e6ced5e0",
      {
        fixed: {
          android: ["Fix indexed RAM bundle"],
        },
      },
    ],
    [
      "d37baa78f11f36aa5fb84307cc29ebe2bf444a33",
      {
        changed: {
          general: [
            "Split NativeImageLoader into NativeImageLoaderAndroid and NativeImageLoaderIOS",
          ],
        },
      },
    ],
    [
      "df9abf798351c43253c449fe2c83c2cca0479d80",
      {
        fixed: {
          android: [
            "- View.getGlobalVisibleRect() clips result rect properly when overflow is 'hidden' ([df9abf7983](https://github.com/facebook/react-native/commit/df9abf798351c43253c449fe2c83c2cca0479d80))",
          ],
        },
      },
      true,
    ],
  ];
  test.each(cases)("%s", (sha, expected, renderFullEntry = false) => {
    return getCommitMessage(sha).then((message) => {
      const commits = [{ sha, commit: { message } }];
      return getAllChangelogDescriptions(commits, {
        gitDir: RN_REPO,
        existingChangelogData: "",
        maxWorkers: 1,
        verbose: true,
        renderOnlyMessage: !renderFullEntry,
      }).then((result) => {
        expect(result).toEqual(deepmerge(CHANGES_TEMPLATE, expected));
      });
    });
  });
});
