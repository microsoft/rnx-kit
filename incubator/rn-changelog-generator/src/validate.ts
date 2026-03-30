import { validateChangelog } from "./utils/validateChangelog";

export function handler(argv: { commitMsg: string }) {
  return validateChangelog(argv.commitMsg);
}

export const args = {
  commitMsg: {
    alias: "c",
    string: true,
    describe:
      "Validate if commit message follows changelog format. Returns 'missing', 'invalid', or 'valid'.",
    demandOption: true,
  },
};
