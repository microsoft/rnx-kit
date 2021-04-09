const { makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("path");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
});
