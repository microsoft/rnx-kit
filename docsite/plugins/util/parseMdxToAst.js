/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const visit = require("unist-util-visit");

const { isComment, getCommentContents } = require("@mdx-js/util");

const unified = require("unified");
const remarkParse = require("remark-parse");
const remarkMdx = require("remark-mdx");
const remarkFootnotes = require("remark-footnotes");
const remarkSqueezeParagraphs = require("remark-squeeze-paragraphs");

/**
 * @typedef {import("unist").Node} UnistNode
 * @typedef {UnistNode & {value?: string, children?: MdAstNode[]}} MdAstNode
 */

/**
 * Transform an MDAST node to an MDXAST node, in place.
 *
 * @param {MdAstNode} node Markdown AST node
 */
function transformMdNodeToMdxNode(node) {
  if (isComment(node.value)) {
    node.type = "comment";
    node.value = getCommentContents(node.value);
  }
}

/**
 * Transform the given MDAST into an MDXAST.
 *
 * @param {MdAstNode} root Markdown AST root node
 * @returns {MdAstNode} Transformed MDX AST root node
 */
function transformMdAstToMdxAst(root) {
  visit(root, "jsx", transformMdNodeToMdxNode);
  return root;
}

/**
 * Unified plugin which converts an MDAST to an MDXAST.
 */
function pluginMdAstToMdxAst() {
  return transformMdAstToMdxAst;
}

/**
 * Parse MDX content into an MDXAST.
 *
 * @param {import("vfile").VFile} vfileMdx Virtual file containing the MDX content to parse
 * @returns {MdAstNode} Root node of the parsed MDXAST
 */
function parseMdxToAst(vfileMdx) {
  /** @type {Record<string, unknown>} */
  const compilerOpts = {
    remarkPlugins: [],
    rehypePlugins: [],
    compilers: [],
  };

  const compiler = unified()
    .use(remarkParse, compilerOpts)
    .use(remarkMdx, compilerOpts)
    .use(remarkFootnotes, compilerOpts)
    .use(remarkSqueezeParagraphs, compilerOpts)
    .use(pluginMdAstToMdxAst);

  const ast = compiler.runSync(compiler.parse(vfileMdx), vfileMdx);
  return ast;
}
module.exports = parseMdxToAst;
