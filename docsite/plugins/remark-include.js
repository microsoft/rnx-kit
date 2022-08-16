/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const path = require("path");
const visit = require("unist-util-visit");

const { isInclude, getIncludePath } = require("./util/include");
const parseMdxToAst = require("./util/parseMdxToAst");
const readVFile = require("./util/readVFile");

/**
 * @typedef {import("unist").Node} UnistNode
 * @typedef {UnistNode & {value?: string, children?: MdAstNode[]}} MdAstNode
 */

const MARKDOWN_REGEX = /\.mdx?$/i;

/**
 * Determine if the given file is a markdown file by inspecting its extension.
 *
 * @param {*} file File to test
 * @returns `true` if the file is a markdown file, `false` otherwise.
 */
function isMarkdownFile(file) {
  return MARKDOWN_REGEX.test(file);
}

/**
 * Remark plugin which walks an MDXAST looking for "include" directives:
 *
 * ```md
 *   <!--include ../../packages/fabrikam-phone/README.md-->
 * ```
 *
 * An include directive shows up in the MDXAST as a comment node:
 *
 * ```js
 *   {
 *     type: "comment",
 *     value: "../../packages/fabrikam-phone/README.md"
 *   }
 * ```
 *
 * The plugin loads the named file, and parses it into an MDXAST. This only
 * works for specific file types, and, for now, only markdown files are
 * supported.
 *
 * Once the file is parsed into an MDXAST, it is inserted into the current
 * MDXAST, replacing the include directive node.
 */
function plugin() {
  return transform;

  /**
   * Transform an MDXAST, replacing include directives with the contents of
   * the included file.
   *
   * @param {MdAstNode} root MDXAST to transform
   * @param {import("vfile").VFile} vfile Virtual file object
   */
  function transform(root, vfile) {
    const locations = [];

    /**
     * Process a single include directive AST node, loading and parsing the
     * file to be included into an MDXAST.
     *
     * Store the location of the include directive along with the replacement
     * MDXAST in a list, to be applied later. We cannot modify the MDXAST
     * while we are traversing it.
     *
     * @param {MdAstNode} node Include directive node
     * @param {number} index Index of the include directive node in its parent's list of children
     * @param {MdAstNode} parent Parent of the include directive node
     */
    function processIncludeDirective(node, index, parent) {
      // Resolve the included file, relative to the current markdown file.
      const p = path.resolve(vfile.dirname, getIncludePath(node));

      if (isMarkdownFile(p)) {
        // Include a markdown file
        const vfileMdx = readVFile(p);
        const ast = parseMdxToAst(vfileMdx);
        locations.push({
          parent,
          index,
          nodes: ast.children,
        });
      } else {
        // Attempting to include an unsupported file type
        throw new Error("Unsupport include-file type :" + p);
      }
    }

    // @ts-expect-error -- The visit() overloads are bound to UnistNode, but we use the expanded MdAstNode
    visit(root, isInclude, processIncludeDirective);

    // Replace all include comments with the included file's AST. Do this in
    // reverse order, so that the indices don't need to be re-calculated
    // after each replacement.
    if (locations.length > 0) {
      locations.reverse();
      locations.forEach((l) => {
        l.parent.children.splice(l.index, 1, ...l.nodes);
      });
    }
  }
}
module.exports = plugin;
