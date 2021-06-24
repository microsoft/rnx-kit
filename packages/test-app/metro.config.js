const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  CyclicDependencies,
} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
const {
  DuplicateDependencies,
} = require("@rnx-kit/metro-plugin-duplicates-checker");
const { MetroSerializer } = require("@rnx-kit/metro-serializer");
const {
  typescriptSerializerHook,
} = require("@rnx-kit/metro-plugin-typescript-validation");

function isDev() {
  const devFlag = process.argv.findIndex((arg) => arg === "--dev");
  if (devFlag >= 0) {
    return process.argv[devFlag + 1] === "true";
  }

  return false;
}

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  serializer: {
    customSerializer: MetroSerializer([
      CyclicDependencies(),
      DuplicateDependencies({ ignoredModules: isDev() ? ["react-is"] : [] }),
    ]),
    experimentalSerializerHook: typescriptSerializerHook,
  },
});
