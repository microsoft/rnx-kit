import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCommands, parseShellInput } from "../src/provider/shell.ts";

describe("parseShellInput()", () => {
  it("joins continued lines", () => {
    deepEqual(parseShellInput("yarn \\\n  test --coverage"), [
      ["yarn", "test", "--coverage"],
    ]);
  });

  it("skips here-documents", () => {
    const input = [
      "cat > a.md <<'EOF'",
      "Run yarn install; then npm publish",
      "EOF",
      "cat <<-END | yarn lint",
      "\tgh pr comment 1",
      "\tEND",
      'grep a <<< "b"',
      "git status",
    ].join("\n");
    deepEqual(parseShellInput(input), [
      ["cat"],
      ["cat"],
      ["yarn", "lint"],
      ["grep", "a"],
      ["git", "status"],
    ]);
  });

  it("does not split quoted newlines", () => {
    deepEqual(parseShellInput("echo 'a\nb' && yarn build"), [
      ["echo", "a\nb"],
      ["yarn", "build"],
    ]);
  });
});

describe("parseCommands()", () => {
  it("starts each input in the checkout root", () => {
    deepEqual(
      parseCommands("/repo", ["cd packages/a && yarn test", "yarn format"]),
      [
        { argv: ["yarn", "test"], cwd: "packages/a" },
        { argv: ["yarn", "format"], cwd: "." },
      ]
    );
  });
});
