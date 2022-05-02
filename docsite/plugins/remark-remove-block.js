/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const zone = require("mdast-zone");

/**
 * @typedef {import("unist").Node} UnistNode
 * @typedef {UnistNode & {value?: string, children?: MdAstNode[]}} MdAstNode
 *
 * @typedef {{start: number, end: number, parent: MdAstNode}} ZoneInfo
 */

/**
 * Comparator for sorting zones in descending order. Zones which appear at the
 * _end_ of the document will be sorted to the _start_ of the list.
 *
 * @param {ZoneInfo} a First zone to compare
 * @param {ZoneInfo} b Second zone to compare
 */
function compareZonesDescending(a, b) {
  return b.start - a.start;
}

/**
 * Remark plugin which walks an MDXAST looking for "remove-block" zones:
 *
 * ```md
 *     <!--remove-block start-->
 *     # Title will be removed
 *     Text will be removed
 *     <!--remove-block end-->
 *     Text will be preserved
 * ```
 *
 * Once all remove-block zones have been found, they are removed from
 * the MDXAST.
 */
function plugin() {
  return transform;

  /**
   * Transform an MDXAST, pruning "remove-block" zones.
   *
   * @param {MdAstNode} root MDXAST to transform
   */
  function transform(root) {
    const zones = [];

    /**
     * Capture location information about the "remove-block" zone.
     *
     * @param {MdAstNode} _start Node which marks the start of the zone
     * @param {MdAstNode[]} _nodes Nodes in the zone
     * @param {MdAstNode} _end Node which marks the end of the zone
     * @param {ZoneInfo} info Location information about the zone
     */
    function capture(_start, _nodes, _end, info) {
      zones.push(info);
    }

    // Search the MDXAST for "remove-block" zones
    zone(root, "remove-block", capture);

    // Prune all zones from the MDXAST in reverse order. Moving backwards
    // means we don't need to adjust indices as we remove zones.
    zones.sort(compareZonesDescending);
    zones.forEach((z) => {
      z.parent.children.splice(z.start, z.end - z.start + 1);
    });
  }
}
module.exports = plugin;
