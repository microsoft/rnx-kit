import { COMMIT_TYPES, MAX_LINE_LENGTH } from "./constants.js";
import type { Issue } from "./types.js";

export function lint(message: string): Issue[] {
  if (!message) {
    return ["empty"];
  }

  const m = message.match(/^(\w*?)(?:\((.*?)\))?[!]?:(.*)/s);
  if (!m) {
    return ["format"];
  }

  const [, type, scope, description] = m;
  const issues = new Set<Issue>();

  if (type.toLowerCase() !== type) {
    issues.add("type-case");
  }

  if (!COMMIT_TYPES.includes(type.toLowerCase())) {
    issues.add("type");
  }

  if (typeof scope === "string") {
    if (!scope) {
      issues.add("scope");
    } else if (scope.toLowerCase() !== scope) {
      issues.add("scope-case");
    }
  }

  if (!description) {
    issues.add("title");
  } else if (!description.startsWith(" ")) {
    issues.add("space-after-colon");
  }

  const [title, emptyLine, ...body] = description.split("\n");
  if (!title.trim()) {
    issues.add("title");
  }
  if (emptyLine) {
    issues.add("paragraph");
  }
  if (body.some((line) => line.length > MAX_LINE_LENGTH)) {
    issues.add("body-line-length");
  }

  return Array.from(issues);
}
