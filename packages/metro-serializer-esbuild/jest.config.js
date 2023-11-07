function mapFixtureDependencies() {
  const metroConfig = require("./metro.config");
  const babelRuntime =
    metroConfig.resolver?.extraNodeModules?.["@babel/runtime"];
  if (!babelRuntime) {
    throw new Error("Cannot find module '@babel/runtime'");
  }

  return {
    "@babel/runtime/(.*)": `${babelRuntime}/$1`,
  };
}

module.exports = {
  preset: "@rnx-kit/jest-preset/private",
  moduleNameMapper: mapFixtureDependencies(),
};
