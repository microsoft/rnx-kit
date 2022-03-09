import https from "https";
import { EventEmitter } from "events";
import { promises as fs } from "fs";
import path from "path";

import { fetchCommits, fetchCommit } from "../../src/utils/commits";

console.warn = () => {};
console.error = () => {};

function requestWithFixtureResponse(fixture: string) {
  const requestEmitter = new EventEmitter();
  const responseEmitter = new EventEmitter();
  (responseEmitter as any).statusCode = 200;
  (responseEmitter as any).headers = { link: 'rel="next"' };
  setImmediate(() => {
    requestEmitter.emit("response", responseEmitter);
    fs.readFile(
      path.join(__dirname, "..", "__fixtures__", fixture),
      "utf-8"
    ).then((data) => {
      responseEmitter.emit("data", data);
      responseEmitter.emit("end");
    });
  });
  return requestEmitter;
}

describe("functions that hit GitHub's commits API", () => {
  // The 2nd to last commit in commits-v0.60.5-page-2.json, which is the 59th commit.
  const base = "53e32a47e4062f428f8d714333236cedbe05b482";
  // The first commit in commits-v0.60.5-page-1.json, which is the last chronologically as the
  // GH API returns commits in DESC order.
  const compare = "35300147ca66677f42e8544264be72ac0e9d1b45";
  const internalCommit = "50e109c78d3ae9c10d8472d2f4888d7f59214fdd";

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
      } else if (
        uri.path === `/repos/facebook/react-native/commits/${internalCommit}`
      ) {
        return requestWithFixtureResponse("commit-internal.json");
      } else {
        throw new Error(`Unexpected request: ${uri.path}`);
      }
    });
    Object.defineProperty(https, "get", { value: getMock });
  });

  describe(fetchCommits, () => {
    it("paginates back from `compare` to `base`", () => {
      return fetchCommits("authn-token", base, compare).then((commits) => {
        expect(commits.length).toEqual(59);
        expect(commits[0].sha).toEqual(
          "35300147ca66677f42e8544264be72ac0e9d1b45"
        );
        expect(commits[30].sha).toEqual(
          "99bc31cfa609e838779c29343684365a2ed6169f"
        );
      });
    });
  });

  describe(fetchCommit, () => {
    it("returns metadata for single commit", () => {
      return fetchCommit(null, internalCommit).then((commitMetadata) => {
        expect(commitMetadata.sha).toEqual(internalCommit);
      });
    });
  });
});
