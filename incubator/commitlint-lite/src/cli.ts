#!/usr/bin/env node

import { COMMIT_TYPES, MAX_LINE_LENGTH } from "./constants.js";
import { lint } from "./index.js";

const data: string[] = [];
const stdin = process.openStdin();
stdin.setEncoding("utf8");
stdin.on("data", (chunk) => data.push(chunk));
stdin.on("end", () => {
  const message = data.join("").trim();
  const issues = lint(message);
  if (issues.length > 0) {
    process.exitCode = issues.length;
    for (const issue of issues) {
      switch (issue) {
        case "body-line-length":
          console.error(
            `✖ Body line length should not exceed ${MAX_LINE_LENGTH} characters`
          );
          break;

        case "empty":
          console.error("✖ No commit message");
          break;

        case "format":
          console.error(
            "✖ Commit message doesn't seem to be following conventional format: type(optional scope): description"
          );
          break;

        case "paragraph":
          console.error("✖ Title and body must be separated by an empty line");
          break;

        case "scope":
          console.error("✖ Scope cannot be empty");
          break;

        case "scope-case":
          console.error("✖ Scope must be all lower case");
          break;

        case "space-after-colon":
          console.error("✖ Space after `:` is required");
          break;

        case "title":
          console.error("✖ Title cannot be empty");
          break;

        case "type": {
          const types = COMMIT_TYPES.join(", ");
          console.error(`✖ Invalid type; please specify one of [${types}]`);
          break;
        }

        case "type-case":
          console.error("✖ Type must be all lower case");
          break;
      }
    }
    console.log(
      "ℹ For more information about conventional commits, see https://www.conventionalcommits.org/"
    );
  }
});
