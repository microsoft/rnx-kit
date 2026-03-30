import type { Commit } from "./commits";
import { formatCommitLink } from "./formatCommitLink";

function getAuthorFormatting(item: Commit) {
  if (item.author?.login) {
    return `[@${item.author.login}](https://github.com/${item.author.login})`;
  } else if (item.commit.author?.name) {
    return item.commit.author.name;
  }
  return null;
}

export function getChangeMessage(item: Commit, onlyMessage = false) {
  const commitMessage = item.commit.message.split("\n");
  let entry =
    commitMessage
      .reverse()
      .find((a) => /\[ios\]|\[android\]|\[general\]/i.test(a)) ||
    commitMessage.reverse()[0];
  entry = entry.replace(/^((changelog:\s*)?(\[\w+\]\s?)+[\s-]*)/i, ""); //Remove the [General] [whatever]
  entry = entry.replace(/ \(#\d*\)$/i, ""); //Remove the PR number if it's on the end

  // Capitalize
  if (/^[a-z]/.test(entry)) {
    entry = entry.slice(0, 1).toUpperCase() + entry.slice(1);
  }

  if (onlyMessage) {
    return entry;
  }

  const author = getAuthorFormatting(item);
  const authorSection = `([${item.sha.slice(0, 10)}](${formatCommitLink(
    item.sha
  )})${author ? " by " + author : ""})`;
  return `- ${entry} ${authorSection}`;
}
