// Regex looks for given categories, types, a file/framework/component, and a message - broken into 4 capture groups
const changelogRegex =
  /\[\s?(ANDROID|GENERAL|IOS|INTERNAL)\s?\]\s?\[\s?(BREAKING|ADDED|CHANGED|DEPRECATED|REMOVED|FIXED|SECURITY)\s?\]\s*?-?\s*?(.*)/i;

const internalChangelogRegex = /\[\s?(INTERNAL)\s?\].*/gi;

export function validateChangelog(commitMsg: string) {
  if (!commitMsg.toLowerCase().includes("changelog:")) {
    return "missing";
  }
  const hasValidChangelog = changelogRegex.test(commitMsg);
  const hasValidInternalChangelog = internalChangelogRegex.test(commitMsg);

  if (hasValidChangelog || hasValidInternalChangelog) {
    return "valid";
  }

  return "invalid";
}
