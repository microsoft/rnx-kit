const path = require("node:path");
module.exports = (modulePath, options) => {
  const srcDir = path.join(options.rootDir ?? "", "src");
  const isTypeScriptSource = options.basedir?.startsWith(srcDir);
  return options.defaultResolver(
    isTypeScriptSource ? modulePath.replace(/\.js$/, ".ts") : modulePath,
    options
  );
};
