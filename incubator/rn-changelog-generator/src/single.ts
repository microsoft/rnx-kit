import { fetchCommit } from "./utils/commits";
import { getChangeDimensions } from "./utils/getChangeDimensions";
import { getChangeMessage } from "./utils/getChangeMessage";

type SingleArgs = {
  commit: string;
  token: string | null;
};

export async function handler(argv: SingleArgs) {
  const commitData = await fetchCommit(argv.token, argv.commit);
  console.log(getChangeMessage(commitData));
  console.log(getChangeDimensions(commitData));
}

export const args = {
  token: {
    alias: "t",
    string: true,
    describe:
      "A GitHub token that has `public_repo` access (generate at https://github.com/settings/tokens)",
    demandOption: false,
    default: null,
  },
  commit: {
    alias: "c",
    string: true,
    describe: "Commit sha to generate changelog message for",
  },
};
