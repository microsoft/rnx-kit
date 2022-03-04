import generator from "./generator";
import single from "./single";

if (require.main === module) {
  require("yargs")
    .command(
      "$0",
      "Generate a React Native changelog from the commits and PRs",
      generator.args,
      generator.handler
    )
    .command(
      "single",
      "Generate changelog message and classification for single commit",
      single.args,
      single.handler
    )
    .help("help").argv;
}
