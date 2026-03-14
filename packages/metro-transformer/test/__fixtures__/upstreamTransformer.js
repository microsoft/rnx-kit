"use strict";

function transform(args) {
  return { ast: { type: "File" }, metadata: { transformer: "upstream", filename: args.filename } };
}

function getCacheKey() {
  return "upstream-cache-key";
}

module.exports = { transform, getCacheKey };
