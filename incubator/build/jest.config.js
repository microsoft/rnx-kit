import * as fs from "node:fs";

const needsTransforming = [
  "find-up",
  "locate-path",
  "p-limit",
  "p-locate",
  "path-exists",
  "yocto-queue",
].join("|");

function isPnpmMode() {
  const url = new URL("../../.yarnrc.yml", import.meta.url);
  const yarnConfig = fs.readFileSync(url, { encoding: "utf-8" });
  return yarnConfig.includes("nodeLinker: pnpm");
}

// eslint-disable-next-line no-restricted-exports
export default {
  preset: "@rnx-kit/jest-preset/private",
  resolver: "@rnx-kit/jest-preset/typescript-esm-resolver.cjs",
  transformIgnorePatterns: [
    isPnpmMode()
      ? `/node_modules/.store/(?!(${needsTransforming})-npm)`
      : `/node_modules/(?!(${needsTransforming})/)`,
  ],
};
