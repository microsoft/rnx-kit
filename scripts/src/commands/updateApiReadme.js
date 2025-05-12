// @ts-check

import { Command } from "clipanion";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

/**
 * @typedef {import("typedoc").JSONOutput.Comment} Comment
 * @typedef {import("typedoc").JSONOutput.CommentDisplayPart} CommentDisplayPart
 * @typedef {import("typedoc").JSONOutput.ParameterReflection} ParameterReflection
 * @typedef {import("typedoc").JSONOutput.SourceReference} SourceReference
 */

export class UpdateApiReadmeCommand extends Command {
  /** @override */
  static paths = [["update-api-readme"]];

  /** @override */
  static usage = Command.Usage({
    description: "Updates the API README",
    details: "This command updates the API README.",
    examples: [["Update the API README", "$0 update-api-readme"]],
  });

  async execute() {
    await updateApiReadme();
  }
}

const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit/api start -->";
const TOKEN_END = "<!-- @rnx-kit/api end -->";

/**
 * @param {SourceReference[] | undefined} sources
 */
function getBaseName(sources) {
  if (Array.isArray(sources)) {
    const filename = sources[0].fileName;
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    if (base !== "index") {
      return base;
    }
  }
  return "-";
}

/**
 * @param {string} source
 * @param {string} identifier
 * @param {Comment | undefined} comment
 * @returns {comment is Comment}
 */
function isCommented(source, identifier, comment) {
  if (!comment) {
    console.warn(
      "WARN",
      `${source}:`,
      `${identifier} is exported but undocumented`
    );
    return false;
  }

  return true;
}

/**
 * @param {import("typedoc")} typedoc
 */
async function parse(typedoc) {
  const app = await typedoc.Application.bootstrap(
    {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        customConditions: ["typescript"],
      },
      entryPoints: ["src/index.ts"],
      excludeInternal: true,
    },
    [new typedoc.TSConfigReader(), new typedoc.TypeDocReader()]
  );

  const project = await app.convert();
  if (!project) {
    throw new Error("Failed to convert project");
  }

  return app.serializer.projectToObject(project, process.cwd());
}

/**
 * @param {CommentDisplayPart[]} parts
 */
function renderSummary(parts) {
  const result = [];

  for (const part of parts) {
    switch (part.kind) {
      case "text":
      case "code":
        result.push(part.text);
        break;
      case "inline-tag":
        switch (part.tag) {
          case "@label":
          case "@inheritdoc": // Shouldn't happen
            break; // Not rendered.
          case "@link":
          case "@linkcode":
          case "@linkplain":
            result.push("`" + part.text + "`");
            break;
        }
        break;
    }
  }

  const comment = result.join("");
  const paragraph = comment.indexOf("\n\n");
  const summary = paragraph > 0 ? comment.substring(0, paragraph) : comment;
  return summary.replaceAll("\n", " ");
}

/**
 * @param {string} source
 * @param {string} name
 * @param {ParameterReflection[] | undefined} parameters
 * @param {Comment} comment
 * @returns {[string, string, string]}
 */
function makeFunctionEntry(source, name, parameters, comment) {
  return [
    source,
    Array.isArray(parameters)
      ? `\`${name}(${parameters
          .map((p) => (p.flags.isRest ? `...${p.name}` : p.name))
          .join(", ")})\``
      : `\`${name}()\``,
    renderSummary(comment.summary),
  ];
}

/**
 * @param {[string, string, string][]} exportedTypes
 * @param {[string, string, string][]} exportedFunctions
 */
async function updateReadme(exportedTypes, exportedFunctions) {
  /** @type {(lhs: [string, string, string], rhs: [string, string, string]) => -1 | 0 | 1} */
  const sortByCategory = (lhs, rhs) => {
    if (lhs[0] !== rhs[0]) {
      return lhs[0] < rhs[0] ? -1 : 1;
    }
    return lhs[1] === rhs[1] ? 0 : lhs[1] < rhs[1] ? -1 : 1;
  };

  /** @type {(table: string[][], options?: {}) => string} */
  // @ts-expect-error no declaration file for markdown-table
  const { markdownTable } = await import("markdown-table");

  const types =
    exportedTypes.length === 0
      ? ""
      : markdownTable([
          ["Category", "Type Name", "Description"],
          ...exportedTypes.sort(sortByCategory),
        ]);

  const functions =
    exportedFunctions.length === 0
      ? ""
      : markdownTable([
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

export async function updateApiReadme() {
  const typedoc = await import("typedoc");

  const project = await parse(typedoc);
  const children = project?.children;
  if (!children) {
    throw new Error("Failed to parse project");
  }

  /** @type {[string, string, string][]} */
  const exportedFunctions = [];

  /** @type {[string, string, string][]} */
  const exportedTypes = [];

  for (const { name, kind, comment, sources, signatures } of children) {
    switch (kind) {
      case typedoc.ReflectionKind.TypeAlias: {
        const source = getBaseName(sources);
        if (isCommented(source, name, comment)) {
          exportedTypes.push([source, name, renderSummary(comment.summary)]);
        }
        break;
      }

      case typedoc.ReflectionKind.Function: {
        if (!signatures) {
          break;
        }

        const source = getBaseName(sources);
        if (isCommented(source, name, comment)) {
          const { parameters } = signatures[signatures.length - 1];
          const fn = makeFunctionEntry(source, name, parameters, comment);
          exportedFunctions.push(fn);
          break;
        } else {
          for (let i = signatures.length - 1; i >= 0; --i) {
            const { comment, parameters } = signatures[i];
            if (isCommented(source, name, comment)) {
              const fn = makeFunctionEntry(source, name, parameters, comment);
              exportedFunctions.push(fn);
              break;
            }
          }
        }
        break;
      }

      default:
        console.warn("Unknown kind:", name);
        break;
    }
  }

  await updateReadme(exportedTypes, exportedFunctions);
}
