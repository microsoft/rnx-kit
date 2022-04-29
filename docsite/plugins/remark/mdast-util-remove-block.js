const zone = require("mdast-zone");

// This plugin removes all markdown nodes between a pair of HTML comments
// in markdown.
//
//     <!--remove-block start-->
//     # Title will be removed
//     Text will be removed
//     <!--remove-block end-->
//     Text will be preserved
//
//  Notice that there is no space between the '--' and the embedded directives.

//  This is the prefix using in HTML comments to mark the start and end of
//  the block to remove.
const COMMENT_PREFIX = "remove-block";

function plugin() {
  return transform;

  function transform(root) {
    const locations = [];

    // Capture a single start/end range.
    function capture(_start, _nodes, _end, info) {
      locations.push(info);
    }

    // Search the AST for ranges denoted by start/end comment markers.
    zone(root, COMMENT_PREFIX, capture);

    // Prune all ranges from the AST in reverse order.
    locations.sort((a, b) => b.start - a.start);
    locations.forEach((l) => {
      root.children.splice(l.start, l.end - l.start + 1);
    });
  }
}
module.exports = plugin;
