const { makeMetroConfig } = require("@rnx-kit/metro-config");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  resetCache: true, // optional, but circumvents stale cache issues
});
