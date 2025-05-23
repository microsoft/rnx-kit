// @ts-check
"use strict";

/**
 * @typedef {import("@typescript-eslint/types/dist/index").TSESTree.Node} Node
 * @typedef {import("eslint").Linter.FlatConfig} FlatConfig
 * @typedef {import("eslint").Rule.RuleContext} ESLintRuleContext
 * @typedef {import("eslint").Rule.ReportFixer} ESLintReportFixer
 * @typedef {{ exports: string[], types: string[] }} NamedExports
 *
 * @typedef {{
 *   id: ESLintRuleContext["id"];
 *   options: {
 *     debug: boolean;
 *     expand: "all" | "external-only";
 *     maxDepth: number;
 *   };
 *   filename: string;
 *   languageOptions: FlatConfig["languageOptions"];
 *   parserOptions: ESLintRuleContext["parserOptions"];
 *   parserPath: ESLintRuleContext["parserPath"];
 *   sourceCode: ESLintRuleContext["sourceCode"];
 * }} RuleContext
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  ecmaVersion: 9,
  ecmaFeatures: {
    globalReturn: false,
    jsx: true,
  },
  sourceType: "module",
  loc: true,
  range: true,
  raw: true,
  tokens: true,
  comment: true,
  eslintVisitorKeys: true,
  eslintScopeManager: true,
};

const NODE_ENV = process.env.NODE_ENV;

/**
 * Returns whether there are any named exports.
 * @param {NamedExports?} namedExports
 * @returns {namedExports is null}
 */
function isEmpty(namedExports) {
  return (
    !namedExports ||
    (namedExports.exports.length === 0 && namedExports.types.length === 0)
  );
}

/**
 * Returns whether a module likely belongs to a project.
 * @param {(string | string[])?} project
 * @param {string} modulePath
 * @returns {boolean}
 */
function isLikelyInProject(project, modulePath) {
  if (
    !project ||
    (!modulePath.endsWith(".ts") && !modulePath.endsWith(".tsx"))
  ) {
    return false;
  }

  const tsconfig = typeof project === "string" ? project : project[0];
  return !path.relative(path.dirname(tsconfig), modulePath).startsWith("..");
}

/**
 * Creates and returns an ES tree traverser.
 * @returns {{ traverse: (node: Node, options: {}) => void; }}
 */
function makeTraverser() {
  const Traverser = require(
    path.join(
      path.dirname(require.resolve("eslint/package.json")),
      "lib",
      "shared",
      "traverser"
    )
  );
  return new Traverser();
}

/**
 * Resolves specified `moduleId` starting from `fromDir`. When possible, prefers
 * `.d.ts` over `.js` as the latter does not contain type information.
 */
const resolveFrom =
  /** @type {() => (fromDir: string, moduleId: string) => string} */
  (
    () => {
      if (NODE_ENV === "test") {
        return (_, moduleId) => moduleId;
      }

      const resolve = require("enhanced-resolve").create.sync({
        extensions: [".ts", ".tsx", ".js", ".jsx"],
        mainFields: ["module", "main"],

        // Add `require` to handle packages that are missing `default`
        // conditional. See
        // https://github.com/webpack/enhanced-resolve/issues/313
        conditionNames: ["typescript", "import", "require", "node"],
      });

      return (fromDir, moduleId) => {
        try {
          const m = resolve(fromDir, moduleId);
          if (!m) {
            throw new Error(
              `Module not found: ${moduleId} (start path: ${fromDir})`
            );
          }
          if (m.endsWith(".js")) {
            // `.js` files don't contain type information. If we find a `.d.ts`
            // next to it, we should use that instead.
            const typedef = m.replace(/\.js$/, ".d.ts");
            if (fs.existsSync(typedef)) {
              return typedef;
            }
          }
          return m;
        } catch (e) {
          // If the module id contains the `.js` extension due to ESM,
          // retry with `.ts`
          if (moduleId.endsWith(".js")) {
            const alternatives = [".ts", ".tsx"];
            for (const alt of alternatives) {
              try {
                return resolve(fromDir, moduleId.replace(/\.js$/, alt));
              } catch (_) {
                // Ignore the exception from the `.ts` file and rethrow
                // the `.js` one to avoid confusion
              }
            }
          }
          throw e;
        }
      };
    }
  )();

/**
 * Converts ESLint's `RuleContext` to our `RuleContext`.
 * @param {ESLintRuleContext} context
 * @returns {RuleContext}
 */
function toRuleContext(context) {
  return {
    id: context.id,
    options: {
      debug: false,
      expand: "all",
      maxDepth: 5,
      ...(context.options && context.options[0]),
    },
    filename: context.filename || context.getFilename(),
    languageOptions: context.languageOptions,
    parserOptions: context.parserOptions,
    parserPath: context.parserPath,
    sourceCode: context.sourceCode,
  };
}

/**
 * Parses specified file and returns an AST.
 * @param {RuleContext} context
 * @param {string} moduleId
 * @returns {{ ast: Node; filename: string; } | null}
 */
function parse(context, moduleId) {
  const { filename, languageOptions, options, parserPath } = context;
  const parseForESLint = (() => {
    // @ts-expect-error This option exists when using flat config
    const parseForESLint = languageOptions?.parser?.parseForESLint;
    if (typeof parseForESLint === "function") {
      return parseForESLint;
    }

    // `parserPath` is only set when using legacy config format
    if (parserPath) {
      const { parseForESLint } = require(parserPath);
      return parseForESLint;
    }

    return null;
  })();
  if (typeof parseForESLint !== "function") {
    return null;
  }

  try {
    const parentDir = path.dirname(filename);
    const modulePath = resolveFrom(parentDir, moduleId);
    const code = fs.readFileSync(modulePath, { encoding: "utf-8" });
    const parserOptions =
      languageOptions?.parserOptions ?? context.parserOptions;
    const { project } = parserOptions;
    return {
      ast: parseForESLint(code, {
        ...DEFAULT_CONFIG,
        ...parserOptions,
        filePath: modulePath,

        /**
         * Unset `project` if we're trying to parse files outside the project,
         * otherwise `@typescript-eslint/parser` will complain:
         *
         *   Error: "parserOptions.project" has been set for X.
         *   The file does not match your project config: Y.
         *   The file must be included in at least one of the projects provided.
         */
        project: isLikelyInProject(project, modulePath) ? project : undefined,
      }).ast,
      filename: modulePath,
    };
  } catch (e) {
    if (options.debug) {
      console.error(e);
    }
  }

  return null;
}

/**
 * Extracts exports from specified file.
 * @param {RuleContext} context
 * @param {unknown} moduleId
 * @param {number} depth
 * @returns {NamedExports | null}
 */
function extractExports(context, moduleId, depth) {
  if (depth === 0 || typeof moduleId !== "string") {
    return null;
  }

  const parseResult = parse(context, moduleId);
  if (!parseResult || !parseResult.ast) {
    return null;
  }

  const { ast, filename } = parseResult;
  try {
    /** @type {Set<string>} */
    const exports = new Set();
    /** @type {Set<string>} */
    const types = new Set();

    const traverser = makeTraverser();
    traverser.traverse(ast, {
      /** @type {(node: Node, parent: Node) => void} */
      enter: (node, parent) => {
        switch (node.type) {
          case "ExportNamedDeclaration": {
            if (parent.type === "TSModuleBlock") {
              // The module or namespace is already exported.
              return;
            }

            const declaration = node.declaration;
            if (declaration) {
              switch (declaration.type) {
                case "ClassDeclaration":
                // fallthrough
                case "FunctionDeclaration":
                // fallthrough
                case "TSDeclareFunction":
                // fallthrough
                case "TSImportEqualsDeclaration": {
                  const name = declaration.id && declaration.id.name;
                  if (name) {
                    exports.add(name);
                  }
                  break;
                }

                case "TSEnumDeclaration": {
                  const name = declaration.id && declaration.id.name;
                  if (name) {
                    const ex = declaration.const ? types : exports;
                    ex.add(name);
                  }
                  break;
                }

                // export namespace N { ... }
                case "TSModuleDeclaration": {
                  switch (declaration.id.type) {
                    case "Identifier":
                      exports.add(declaration.id.name);
                      break;
                    case "Literal": {
                      const name = declaration.id.value;
                      if (typeof name === "string") {
                        exports.add(name);
                      }
                      break;
                    }
                  }
                  break;
                }

                case "TSInterfaceDeclaration":
                // fallthrough
                case "TSTypeAliasDeclaration": {
                  const name = declaration.id && declaration.id.name;
                  if (name) {
                    types.add(name);
                  }
                  break;
                }

                case "VariableDeclaration":
                  declaration.declarations.forEach((declaration) => {
                    if (declaration.id.type === "Identifier") {
                      exports.add(declaration.id.name);
                    }
                  });
                  break;
              }
            } else {
              const set = node.exportKind === "type" ? types : exports;
              node.specifiers.forEach((spec) => {
                const exported = spec.exported;
                const name =
                  exported.type === "Identifier"
                    ? exported.name
                    : exported.value;
                if (name !== "default") {
                  set.add(name);
                }
              });
            }
            break;
          }

          case "ExportAllDeclaration": {
            const source = node.source && node.source.value;
            if (source) {
              const namedExports = extractExports(
                { ...context, filename },
                source,
                depth - 1
              );
              if (namedExports) {
                namedExports.exports.forEach((name) => exports.add(name));
                namedExports.types.forEach((name) => types.add(name));
              }
            }
            break;
          }

          // Prior to v6, a `TSImportEqualsDeclaration` will have an `isExport`
          // property instead of being wrapped in an `ExportNamedDeclaration`.
          // See https://github.com/typescript-eslint/typescript-eslint/issues/4130
          case "TSImportEqualsDeclaration":
            if ("isExport" in node && node.isExport) {
              // export import foo = require('./foo');
              // export import Bar = Foo.Bar;
              exports.add(node.id.name);
            }
            break;
        }
      },
    });
    return {
      exports: [...exports],
      types: [...types],
    };
  } catch (e) {
    if (context.options.debug) {
      console.error(e);
    }
  }

  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow `export *`",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          debug: { type: "boolean" },
          expand: { enum: ["all", "external-only"] },
          maxDepth: { type: "number" },
        },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    const ruleContext = toRuleContext(context);
    const { expand, maxDepth } = ruleContext.options;
    return {
      ExportAllDeclaration: (node) => {
        const source = node.source.value;
        const isInternal = source && source.toString().startsWith(".");
        // export * as foo from "foo";
        const isExportNamespace = Boolean(node.exported);
        if ((expand === "external-only" && isInternal) || isExportNamespace) {
          return;
        }

        const result = extractExports(ruleContext, source, maxDepth);
        context.report({
          node,
          message:
            "Prefer explicit exports over `export *` to avoid name clashes, and improve tree-shakeability.",
          fix: isEmpty(result)
            ? null
            : (fixer) => {
                /** @type {string[]} */
                const lines = [];
                if (result.types.length > 0) {
                  const uniqueTypes = result.types.filter(
                    (type) => !result.exports.includes(type)
                  );
                  if (uniqueTypes.length > 0) {
                    const types = uniqueTypes.sort().join(", ");
                    lines.push(
                      `export type { ${types} } from ${node.source.raw};`
                    );
                  }
                }
                if (result.exports.length > 0) {
                  const names = result.exports.sort().join(", ");
                  lines.push(`export { ${names} } from ${node.source.raw};`);
                }
                return fixer.replaceText(node, lines.join("\n"));
              },
        });
      },
    };
  },
};
