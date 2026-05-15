// Shim for `node:fs`. Re-exports the live Node built-in at runtime so the
// Metro bundle stays self-contained but still has access to Node's stdlib
// when evaluated under Node (vm sandbox or child process).
module.exports = require("node:fs");
