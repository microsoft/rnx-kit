// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @typedef {import("typedoc").JSONOutput.Comment} Comment
 * @typedef {import("typedoc").JSONOutput.CommentDisplayPart} CommentDisplayPart
 * @typedef {import("typedoc").JSONOutput.SourceReference} SourceReference
 */

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
  return summary.replace(/\n/g, " ");
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
  const { default: typedoc } = await import("typedoc");

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
        const source = getBaseName(sources);
        signatures?.forEach(({ name, comment, parameters }) => {
          if (isCommented(source, name, comment)) {
            exportedFunctions.push([
              source,
              Array.isArray(parameters)
                ? `\`${name}(${parameters
                    .map((p) => (p.flags.isRest ? `...${p.name}` : p.name))
                    .join(", ")})\``
                : `\`${name}()\``,
              renderSummary(comment.summary),
            ]);
          }
        });
        break;
      }
      default:
        console.warn("Unknown kind:", name);
    }
  }

  await updateReadme(exportedTypes, exportedFunctions);
}
