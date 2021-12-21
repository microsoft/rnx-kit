import https from "https";
import chalk from "chalk";
import { IncomingHttpHeaders } from "http";

export interface Commit {
  sha: string;
  commit: { message: string };
  author?: { login: string };
}

function fetchJSON<T>(token: string | null, path: string) {
  const host = "api.github.com";
  console.warn(chalk.yellow(`https://${host}${path}`));
  return new Promise<{ json: T; headers: IncomingHttpHeaders }>(
    (resolve, reject) => {
      let data = "";

      https
        .get({
          host,
          path,
          headers: {
            ...(token != null ? { Authorization: `token ${token}` } : null),
            "User-Agent":
              "https://github.com/react-native-community/releases/blob/master/scripts/changelog-generator.js",
          },
        })
        .on("response", (response) => {
          if (response.statusCode !== 200) {
            return reject(
              new Error(`[!] Got HTTP status: ${response.statusCode}`)
            );
          }

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            try {
              resolve({ json: JSON.parse(data), headers: response.headers });
            } catch (e) {
              reject(e);
            }
          });

          response.on("error", (error) => {
            reject(error);
          });
        });
    }
  );
}

export function fetchCommits(
  token: string | null,
  base: string,
  compare: string
) {
  console.warn(chalk.green("Fetch commit data"));
  console.group();
  const commits: Commit[] = [];
  let page = 1;
  return new Promise<Commit[]>((resolve, reject) => {
    const fetchPage = () => {
      fetchJSON<Commit[]>(
        token,
        `/repos/facebook/react-native/commits?sha=${compare}&page=${page++}`
      )
        .then(({ json, headers }) => {
          for (const commit of json) {
            commits.push(commit);
            if (commit.sha === base) {
              console.groupEnd();
              return resolve(commits);
            }
          }
          if (!(headers["link"] as string).includes("next")) {
            throw new Error(
              "Did not find commit after paging through all commits"
            );
          }
          setImmediate(fetchPage);
        })
        .catch((e) => {
          console.groupEnd();
          reject(e);
        });
    };
    fetchPage();
  });
}

export function fetchCommit(token: string | null, sha: string) {
  return new Promise<Commit>((resolve, reject) => {
    fetchJSON<Commit>(token, `/repos/facebook/react-native/commits/${sha}`)
      .then(({ json }) => {
        resolve(json);
      })
      .catch((e) => {
        console.error(e);
        reject(e);
      });
  });
}
