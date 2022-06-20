// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver ?? {};

if (!config.resolver.blacklistRE) {
  config.resolver.blacklistRE = [];
} else if (!Array.isArray(config.resolver.blacklistRE)) {
  config.resolver.blacklistRE = [config.resolver.blacklistRE];
}
config.resolver.blacklistRE.push(/.*__fixtures__.*/);

if (!config.resolver.blockList) {
  config.resolver.blockList = [];
} else if (!Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = [config.resolver.blockList];
}
config.resolver.blockList.push(/.*__fixtures__.*/);

module.exports = config;
