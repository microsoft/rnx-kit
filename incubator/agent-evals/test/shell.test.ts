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

  it("does not mistake arithmetic shifts for here-documents", () => {
    deepEqual(parseShellInput("echo $((1<<2))\nyarn lint\n2"), [
      ["echo", "$((1<<2))"],
      ["yarn", "lint"],
      ["2"],
    ]);
  });

  it("skips comments", () => {
    const input = "# see <<EOF\nyarn lint # or <<EOF\necho a#b '# c'";
    deepEqual(parseShellInput(input), [
      ["yarn", "lint"],
      ["echo", "a#b", "# c"],
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
  it("starts each input in the start directory", () => {
    deepEqual(
      parseCommands("/repo", "/repo", [
        "cd packages/a && yarn test",
        "yarn format",
      ]),
      [
        { argv: ["yarn", "test"], cwd: "packages/a" },
        { argv: ["yarn", "format"], cwd: "." },
      ]
    );
  });

  it("reports directories relative to the root when starting elsewhere", () => {
    deepEqual(
      parseCommands("/repo", "/repo/packages/a", [
        "yarn test && cd ../b && yarn lint && cd && yarn format",
        "cd .. && yarn build",
      ]),
      [
        { argv: ["yarn", "test"], cwd: "packages/a" },
        { argv: ["yarn", "lint"], cwd: "packages/b" },
        { argv: ["yarn", "format"], cwd: "packages/a" },
        { argv: ["yarn", "build"], cwd: "packages" },
      ]
    );
  });

  it("parses commands after here-documents with escaped delimiters", () => {
    deepEqual(
      parseCommands("/r", "/r", ["cat > f <<\\EOF\nhello\nEOF\nyarn lint"]),
      [
        { argv: ["cat"], cwd: "." },
        { argv: ["yarn", "lint"], cwd: "." },
      ]
    );
  });

  it("restores the directory after subshells", () => {
    deepEqual(
      parseCommands("/r", "/r", [
        "(cd packages/a && yarn test) && yarn lint",
        "echo $(cd packages/b && pwd) && yarn format",
        "case $x in a) cd packages/c;; esac; yarn build",
      ]),
      [
        { argv: ["yarn", "test"], cwd: "packages/a" },
        { argv: ["yarn", "lint"], cwd: "." },
        { argv: ["echo", "$"], cwd: "." },
        { argv: ["pwd"], cwd: "packages/b" },
        { argv: ["yarn", "format"], cwd: "." },
        { argv: ["case", "$x", "in", "a"], cwd: "." },
        { argv: ["esac"], cwd: "packages/c" },
        { argv: ["yarn", "build"], cwd: "packages/c" },
      ]
    );
  });
});
