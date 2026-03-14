"use strict";

function transform(args) {
  return { ast: { type: "File" }, metadata: { transformer: "svg", filename: args.filename } };
}

module.exports = { transform };
