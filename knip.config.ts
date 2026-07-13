const allFixtures = "test/__fixtures__/**/*.{js,jsx,ts,tsx}";
const allTests = "test/**/*.test.{js,mts,ts}";

const jestDependencies = ["@rnx-kit/jest-preset"];
const reactNativeDependencies = ["@babel/core", "@babel/preset-env"];
const testAppDependencies = [
  "@babel/preset-env",
  "@react-native-community/cli",
  "@react-native-community/cli-platform-android",
  "@react-native-community/cli-platform-ios",
  "@react-native-webapis/web-storage",
  "@rnx-kit/build",
  "@rnx-kit/cli",
  "@rnx-kit/eslint-config",
  "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
  "@rnx-kit/metro-plugin-duplicates-checker",
  "@rnx-kit/metro-serializer",
  "@rnx-kit/metro-serializer-esbuild",
  "@rnx-kit/react-native-host",
  "@rnx-kit/third-party-notices",
];

/* oxlint-disable-next-line import/no-default-export */
export default {
  include: ["files", "dependencies", "binaries"],
  exclude: ["optionalPeerDependencies"],
  ignore: [
    ".github/workflows/align-deps.yml",
    ".github/workflows/rnx-build.yml",
    "docsite/**/*",
    "incubator/#archived/**/*",
    "incubator/@react-native-webapis/scan/merge.mjs",
  ],
  ignoreBinaries: ["clang-format", "ktlint", "rnx", "swiftformat", "swiftlint"],
  metro: false,
  "react-native": false, // Knip fails if @rnx-kit/cli hasn't been built
  workspaces: {
    ".": {
      ignoreBinaries: ["scripts/rnx-align-deps.js"],
      ignoreDependencies: ["eslint"],
    },
    "incubator/@react-native-webapis/battery-status": {
      entry: ["react-native.config.js"],
      ignoreDependencies: reactNativeDependencies,
    },
    "incubator/@react-native-webapis/web-storage": {
      entry: ["react-native.config.js", allTests],
      ignoreDependencies: reactNativeDependencies,
    },
    "incubator/fork-sync": {
      entry: ["harness/**/*.ts"],
    },
    "incubator/rn-changelog-generator": {
      entry: [allTests],
      ignoreDependencies: jestDependencies,
    },
    "incubator/test-fixtures": {
      entry: [allFixtures, allTests],
    },
    "incubator/tools-performance": {
      entry: ["test/scripts.mjs", allTests],
    },
    "incubator/tools-typescript": {
      entry: [allTests],
      ignoreDependencies: jestDependencies,
    },
    "incubator/yarn-plugin-ignore": {
      entry: ["src/index.ts", allTests],
    },
    "packages/align-deps": {
      entry: [allFixtures, allTests],
    },
    "packages/babel-preset-metro-react-native": {
      entry: [allFixtures, allTests],
      ignoreDependencies: ["@rnx-kit/babel-plugin-import-path-remapper"],
    },
    "packages/cli": {
      entry: ["scripts/**/*.ts", "src/bin/rnx-cli.ts", allTests],
      ignoreDependencies: [...reactNativeDependencies, ...jestDependencies],
    },
    "packages/esbuild-plugin-import-path-remapper": {
      entry: [allFixtures, allTests],
    },
    "packages/jest-preset": {
      entry: [allFixtures, allTests],
    },
    "packages/metro-config": {
      entry: [allTests],
      ignoreDependencies: reactNativeDependencies,
    },
    "packages/metro-plugin-typescript": {
      entry: [allTests],
      ignoreDependencies: jestDependencies,
    },
    "packages/metro-resolver-symlinks": {
      entry: ["jest.config.js", allTests],
      ignoreDependencies: jestDependencies,
    },
    "packages/metro-serializer-esbuild": {
      entry: ["metro.config.js", allFixtures, allTests],
      ignoreDependencies: ["@babel/preset-env"],
    },
    "packages/react-native-auth": {
      ignoreDependencies: [
        ...reactNativeDependencies,
        "@react-native-community/cli",
        "@react-native-community/cli-platform-android",
        "@react-native-community/cli-platform-ios",
        "@react-native/metro-config",
      ],
    },
    "packages/react-native-host": {
      entry: ["react-native.config.js"],
    },
    "packages/react-native-lazy-index": {
      entry: [allFixtures, allTests],
      ignoreDependencies: ["babel-plugin-codegen"],
    },
    "packages/template": {
      entry: ["src/types.ts", allTests],
    },
    "packages/test-app": {
      entry: ["*.js", "src/App.native.tsx", "test/*.{js,mjs,ts,tsx}"],
      ignoreDependencies: [
        ...testAppDependencies,
        "@rnx-kit/react-native-test-app-msal",
      ],
    },
    "packages/test-app-macos": {
      entry: ["*.js"],
      ignoreDependencies: [
        ...testAppDependencies,
        "@rnx-kit/react-native-auth",
        "@rnx-kit/react-native-test-app-msal",
      ],
    },
    "packages/test-app-windows": {
      entry: ["*.js"],
      ignoreDependencies: [
        ...testAppDependencies,
        "@rnx-kit/react-native-auth",
      ],
    },
    "packages/tools-language": {
      entry: ["*.{d.ts,js}", allTests],
    },
    "packages/tools-node": {
      entry: ["*.{d.ts,js}", allTests],
    },
    "packages/tools-shell": {
      entry: [allTests],
      ignoreDependencies: jestDependencies,
    },
    "packages/tools-react-native": {
      entry: ["*.{d.ts,js}", allTests],
    },
    "packages/tsconfig": {
      entry: ["tsconfig*.json"],
    },
    "packages/types-*": {
      entry: ["src/*.ts"],
    },
    "packages/typescript-service": {
      entry: [allFixtures, allTests],
    },
    scripts: {
      entry: ["*.{cjs,js}"],
      ignoreBinaries: ["rnx-kit-scripts"],
      ignoreDependencies: ["jest"],
    },
    ...Object.fromEntries(
      [
        "incubator/build",
        "incubator/lint-json",
        "incubator/lint-lockfile",
        "incubator/lint-package",
        "incubator/metro-transformer-oxc",
        "incubator/polyfills",
        "incubator/reporter",
        "incubator/tools-babel",
        "incubator/tools-formatting",
        "incubator/tools-git",
        "packages/babel-plugin-import-path-remapper",
        "packages/bundle-diff",
        "packages/commitlint-lite",
        "packages/config",
        "packages/console",
        "packages/eslint-plugin",
        "packages/metro-plugin-cyclic-dependencies-detector",
        "packages/metro-plugin-duplicates-checker",
        "packages/metro-serializer",
        "packages/metro-service",
        "packages/suggestion-bot",
        "packages/third-party-notices",
        "packages/tools-filesystem",
        "packages/tools-packages",
        "packages/tools-workspaces",
      ].map((key) => [key, { entry: [allTests] }])
    ),
  },
};
