import { Commit } from "./commits";

export const CHANGE_TYPE = [
  "breaking",
  "added",
  "changed",
  "deprecated",
  "removed",
  "fixed",
  "security",
  "unknown",
  "failed",
] as const;
export type ChangeType = typeof CHANGE_TYPE[number];

export const CHANGE_CATEGORY = [
  "android",
  "ios",
  "general",
  "internal",
] as const;
export type ChangeCategory = typeof CHANGE_CATEGORY[number];

const CHANGELOG_LINE_REGEXP = new RegExp(
  `(\\[(${[...CHANGE_TYPE, ...CHANGE_CATEGORY].join("|")})\\]s*)+`,
  "i"
);
function isAndroidCommit(change: string) {
  return (
    !/(\[ios\]|\[general\])/i.test(change) &&
    (/\b(android|java)\b/i.test(change) || /android/i.test(change))
  );
}

function isIOSCommit(change: string) {
  return (
    !/(\[android\]|\[general\])/i.test(change) &&
    (/\b(ios|xcode|swift|objective-c|iphone|ipad)\b/i.test(change) ||
      /ios\b/i.test(change) ||
      /\brct/i.test(change))
  );
}

function isBreaking(change: string) {
  return /\b(breaking)\b/i.test(change);
}

function isAdded(change: string) {
  return /\b(added)\b/i.test(change);
}

function isChanged(change: string) {
  return /\b(changed)\b/i.test(change);
}

function isDeprecated(change: string) {
  return /\b(deprecated)\b/i.test(change);
}

function isRemoved(change: string) {
  return /\b(removed)\b/i.test(change);
}

function isFixed(change: string) {
  return /\b(fixed)\b/i.test(change);
}

function isSecurity(change: string) {
  return /\b(security)\b/i.test(change);
}

function isFabric(change: string) {
  return /\b(fabric)\b/i.test(change);
}

function isTurboModules(change: string) {
  return /\b(tm)\b/i.test(change);
}

function isInternal(change: string) {
  return /\[internal\]/i.test(change);
}

function getChangeType(changelogMsg: string, commitMsg: string): ChangeType {
  if (isBreaking(changelogMsg)) {
    return "breaking";
  } else if (isAdded(changelogMsg)) {
    return "added";
  } else if (isChanged(changelogMsg)) {
    return "changed";
  } else if (isFixed(changelogMsg)) {
    return "fixed";
  } else if (isRemoved(changelogMsg)) {
    return "removed";
  } else if (isDeprecated(changelogMsg)) {
    return "deprecated";
  } else if (isSecurity(commitMsg)) {
    return "security";
  } else if (commitMsg.match(/changelog/i)) {
    return "failed";
  } else {
    return "unknown";
  }
}

function getChangeCategory(commitMsg: string): ChangeCategory {
  if (isAndroidCommit(commitMsg)) {
    return "android";
  } else if (isIOSCommit(commitMsg)) {
    return "ios";
  } else {
    return "general";
  }
}
export default function getChangeDimensions(item: Commit) {
  const commitMsg = item.commit.message;
  let changelogMsg = commitMsg.split("\n").find((line) => {
    return CHANGELOG_LINE_REGEXP.test(line);
  });
  const doesNotFollowTemplate = !changelogMsg;
  if (!changelogMsg) {
    changelogMsg = commitMsg;
  }

  return {
    doesNotFollowTemplate,
    changeCategory: getChangeCategory(changelogMsg),
    changeType: getChangeType(changelogMsg, commitMsg),
    fabric: isFabric(changelogMsg.split("\n")[0]),
    internal: isInternal(changelogMsg),
    turboModules: isTurboModules(changelogMsg.split("\n")[0]),
  };
}
