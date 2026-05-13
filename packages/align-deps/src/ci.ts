type LogGroup = {
  end: string;
  start: string;
};

type Env = NodeJS.ProcessEnv;

function escapeGitHubCommand(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

export function logGroupFor(
  title: string,
  env: Env = process.env
): LogGroup | undefined {
  if (env["GITHUB_ACTIONS"] === "true") {
    return {
      start: `::group::${escapeGitHubCommand(title)}`,
      end: "::endgroup::",
    };
  }

  if (env["TF_BUILD"] === "True") {
    return {
      start: `##[group]${title}`,
      end: "##[endgroup]",
    };
  }

  return undefined;
}
