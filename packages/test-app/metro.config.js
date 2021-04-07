const { makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("path");

module.exports = makeMetroConfig({
  projectRoot: path.join(__dirname, "src"),
});
