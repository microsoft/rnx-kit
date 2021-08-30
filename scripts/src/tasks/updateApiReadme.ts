import * as babelParser from "@babel/parser";
import {
  Comment,
  ExportNamedDeclaration,
  FunctionDeclaration,
  isExportNamedDeclaration,
  isIdentifier,
  LVal,
  TSInterfaceDeclaration,
  TSTypeAliasDeclaration,
} from "@babel/types";
import { DocExcerpt, DocNode, TSDocParser } from "@microsoft/tsdoc";
import * as fs from "fs";
import glob from "glob";
import * as path from "path";

const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit/api start -->";
const TOKEN_END = "<!-- @rnx-kit/api end -->";

type Context = {
  identifier: string;
  sourceFilename: string;
  tsdocParser: TSDocParser;
};

function extractBrief(summary: string): string {
  const newParagraph = summary.indexOf("\n\n");
  return (newParagraph > 0 ? summary.substring(0, newParagraph) : summary)
    .trim()
    .replace(/\n/g, " ");
}

function findLastBlockComment(
  comments: readonly Comment[] | null
): Comment | null {
  if (comments) {
    for (let i = comments.length - 1; i >= 0; --i) {
      if (comments[i].type === "CommentBlock") {
        return comments[i];
      }
    }
  }
  return null;
}

function findSourceFiles(): string[] {
  try {
    const tsconfig = require.resolve("./tsconfig.json", {
      paths: [process.cwd()],
    });
    const { include } = require(tsconfig);
    if (Array.isArray(include)) {
      return include.reduce<string[]>((result, pattern) => {
        if (fs.existsSync(pattern)) {
          if (fs.statSync(pattern).isDirectory()) {
            result.push(...glob.sync(`${pattern}/**/*.ts`));
          } else {
            result.push(pattern);
          }
        } else {
          result.push(...glob.sync(pattern));
        }
        return result;
      }, []);
    }
  } catch (_) {
    /* ignore */
  }
  return [];
}

function getDescription(
  { identifier, sourceFilename, tsdocParser }: Context,
  node: ExportNamedDeclaration
): string {
  const commentBlock = findLastBlockComment(node.leadingComments);
  if (!commentBlock) {
    console.warn(
      "WARN",
      `${sourceFilename}:`,
      `${identifier} is exported but undocumented`
    );
    return "";
  }

  const result = tsdocParser.parseString("/*" + commentBlock.value + "*/");
  const summary = renderDocNode(result.docComment.summarySection);
  return extractBrief(summary);
}

function getExportedName(
  node: FunctionDeclaration | TSInterfaceDeclaration | TSTypeAliasDeclaration
): string {
  if (!isIdentifier(node.id)) {
    // TODO: Unnamed functions are currently unsupported
    return "";
  }

  return node.id.name;
}

function renderDocNode(docNode: DocNode): string {
  const content: string[] = [];
  if (docNode) {
    if (docNode instanceof DocExcerpt) {
      content.push(docNode.content.toString());
    }
    docNode.getChildNodes().forEach((childNode) => {
      content.push(renderDocNode(childNode));
    });
  }
  return content.join("");
}

function renderParamNode(node: LVal): string {
  switch (node.type) {
    case "ArrayPattern":
      return "[]";
    case "AssignmentPattern":
      return renderParamNode(node.left);
    case "Identifier":
      return node.name;
    case "MemberExpression":
      throw new Error(`Unsupported parameter type: ${node.type}`);
    case "ObjectPattern":
      return "{}";
    case "RestElement":
      return `...${renderParamNode(node.argument)}`;
    case "TSParameterProperty":
      throw new Error(`Unsupported parameter type: ${node.type}`);
  }
}

function updateReadme(
  exportedTypes: [string, string, string][],
  exportedFunctions: [string, string, string][]
): void {
  const sortByCategory = (
    lhs: [string, string, string],
    rhs: [string, string, string]
  ) => {
    if (lhs[0] !== rhs[0]) {
      return lhs[0] < rhs[0] ? -1 : 1;
    }
    return lhs[1] === rhs[1] ? 0 : lhs[1] < rhs[1] ? -1 : 1;
  };

  const types =
    exportedTypes.length === 0
      ? ""
      : require("markdown-table")([
          ["Category", "Type Name", "Description"],
          ...exportedTypes.sort(sortByCategory),
        ]);

  const functions =
    exportedFunctions.length === 0
      ? ""
      : require("markdown-table")([
          ["Category", "Function", "Description"],
          ...exportedFunctions.sort(sortByCategory),
        ]);

  const readme = fs.readFileSync(README, { encoding: "utf-8" });
  const updatedReadme = readme.replace(
    new RegExp(`${TOKEN_START}([^]+)${TOKEN_END}`),
    `${TOKEN_START}\n\n${[types, functions]
      .filter(Boolean)
      .join("\n\n")}\n\n${TOKEN_END}`
  );

  if (updatedReadme !== readme) {
    fs.writeFileSync(README, updatedReadme);
  }
}

export function updateApiReadme(): void {
  const tsdocParser = new TSDocParser();

  const exportedFunctions: [string, string, string][] = [];
  const exportedTypes: [string, string, string][] = [];
  findSourceFiles().forEach((file) => {
    const category = path.basename(file, ".ts");
    const content = fs.readFileSync(file, { encoding: "utf-8" });
    babelParser
      .parse(content, {
        plugins: ["typescript"],
        sourceType: "module",
        sourceFilename: file,
      })
      .program.body.forEach((node) => {
        if (!isExportNamedDeclaration(node)) {
          return;
        }

        switch (node.declaration?.type) {
          case "FunctionDeclaration": {
            const name = getExportedName(node.declaration);
            if (!name) {
              return;
            }

            const identifier = `\`${name}(${node.declaration.params
              .map(renderParamNode)
              .join(", ")})\``;

            const description = getDescription(
              {
                identifier,
                sourceFilename: file,
                tsdocParser,
              },
              node
            );
            if (!description) {
              return;
            }

            exportedFunctions.push([category, identifier, description]);
            break;
          }
          case "TSInterfaceDeclaration":
          case "TSTypeAliasDeclaration": {
            const identifier = getExportedName(node.declaration);
            if (!identifier) {
              return;
            }

            const description = getDescription(
              {
                identifier,
                sourceFilename: file,
                tsdocParser,
              },
              node
            );
            if (!description) {
              return;
            }

            exportedTypes.push([category, identifier, description]);
            break;
          }
        }
      });
  });

  updateReadme(exportedTypes, exportedFunctions);
}
