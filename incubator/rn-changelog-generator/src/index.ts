import generator from "./generator";
import single from "./single";
import validateChangelog from "./utils/validateChangelog";
import validate from "./validate";

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
    .command(
      "validate",
      "Validate if a commit message meets changelog requirements. Returns 'missing', 'valid' or 'invalid'",
      validate.args,
      validate.handler
    )
    .help("help").argv;
}

export default {
  validate: validateChangelog,
};
