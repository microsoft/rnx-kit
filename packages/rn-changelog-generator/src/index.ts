import generate from "./generator";
import path from "path";

if (require.main === module) {
  require("yargs")
    .command(
      "$0",
      "Generate a React Native changelog from the commits and PRs",
      {
        base: {
          alias: "b",
          string: true,
          describe:
            "The base branch/tag/commit to compare against (most likely the previous stable version)",
          demandOption: true,
        },
        compare: {
          alias: "c",
          string: true,
          describe:
            "The new version branch/tag/commit (most likely the latest release candidate)",
          demandOption: true,
        },
        repo: {
          alias: "r",
          string: true,
          describe: "The path to an up-to-date clone of the react-native repo",
          demandOption: true,
        },
        changelog: {
          alias: "f",
          string: true,
          describe: "The path to the existing CHANGELOG.md file",
          demandOption: true,
          default: path.resolve(__dirname, "../CHANGELOG.md"),
        },
        token: {
          alias: "t",
          string: true,
          describe:
            "A GitHub token that has `public_repo` access (generate at https://github.com/settings/tokens)",
          demandOption: false,
          default: null,
        },
        maxWorkers: {
          alias: "w",
          number: true,
          describe:
            "Specifies the maximum number of concurrent sub-processes that will be spawned",
          default: 10,
        },
        verbose: {
          alias: "v",
          boolean: true,
          describe:
            "Verbose listing, includes internal changes as well as public-facing changes",
          demandOption: false,
          default: false,
        },
      },
      generate
    )
    .help("help").argv;
}
