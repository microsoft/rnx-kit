import * as path from "node:path";
import type { Input } from "../src/metafile";
import type { Result } from "../src/types";

export const repoRoot = path.resolve(__dirname, "..", "..", "..");

function makeManifest(name, version = "0.0.0") {
  return JSON.stringify({ name, version });
}

export const inputWithDuplicates: Record<string, Input> = {};
inputWithDuplicates[
  `${repoRoot}/node_modules/@rnx-kit/build/node_modules/chalk/source/index.js`
] = {
  bytes: 15399,
  imports: [
    {
      path: "__rnx_prelude__",
      kind: "import-statement",
      external: true,
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/classCallCheck.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/classCallCheck",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/createClass.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/createClass",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/inherits.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/inherits",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/possibleConstructorReturn.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/possibleConstructorReturn",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/getPrototypeOf.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/getPrototypeOf",
    },
    {
      path: "../../node_modules/event-target-shim/dist/event-target-shim.js",
      kind: "require-call",
      original: "event-target-shim",
    },
  ],
  format: "cjs",
};

inputWithDuplicates[`${repoRoot}/node_modules/chalk/source/index.js`] = {
  bytes: 15403,
  imports: [
    {
      path: "__rnx_prelude__",
      kind: "import-statement",
      external: true,
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/classCallCheck.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/classCallCheck",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/createClass.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/createClass",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/inherits.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/inherits",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/possibleConstructorReturn.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/possibleConstructorReturn",
    },
    {
      path: "../../node_modules/@babel/runtime/helpers/getPrototypeOf.js",
      kind: "require-call",
      original: "@babel/runtime/helpers/getPrototypeOf",
    },
    {
      path: "../../node_modules/event-target-shim/dist/event-target-shim.js",
      kind: "require-call",
      original: "event-target-shim",
    },
  ],
  format: "cjs",
};

export const inputWithDuplicatesFS: Record<string, string> = {
  "repo/node_modules/@apollo/client/package.json":
    makeManifest("@apollo/client"),
  "repo/packages/ra-ui-materialui/package.json":
    makeManifest("ra-ui-materialui"),
  [`${repoRoot}/node_modules/@rnx-kit/build/node_modules/chalk/package.json`]:
    makeManifest("chalk"),
  [`${repoRoot}/node_modules/chalk/package.json`]: makeManifest("chalk"),
};

export const inputWithoutDuplicates: Record<string, Input> = {
  "repo/node_modules/@apollo/client/utilities/globals/fix-graphql.js": {
    bytes: 237,
    imports: [
      {
        path: "repo/node_modules/ts-invariant/process/index.js",
        kind: "import-statement",
        original: "ts-invariant/process/index.js",
      },
      {
        path: "repo/node_modules/graphql/index.mjs",
        kind: "import-statement",
        original: "graphql",
      },
    ],
    format: "esm",
  },
  "repo/packages/ra-ui-materialui/src/input/TimeInput.tsx": {
    bytes: 4549,
    imports: [
      {
        path: "repo/node_modules/react/index.js",
        kind: "import-statement",
        original: "react",
      },
      {
        path: "repo/node_modules/prop-types/index.js",
        kind: "import-statement",
        original: "prop-types",
      },
      {
        path: "repo/node_modules/clsx/dist/clsx.js",
        kind: "import-statement",
        original: "clsx",
      },
      {
        path: "repo/node_modules/@mui/material/TextField/index.js",
        kind: "import-statement",
        original: "@mui/material/TextField",
      },
      {
        path: "repo/packages/ra-core/src/index.ts",
        kind: "import-statement",
        original: "ra-core",
      },
      {
        path: "./CommonInputProps",
        kind: "import-statement",
        external: true,
      },
      {
        path: "repo/packages/ra-ui-materialui/src/input/sanitizeInputRestProps.ts",
        kind: "import-statement",
        original: "./sanitizeInputRestProps",
      },
      {
        path: "repo/packages/ra-ui-materialui/src/input/InputHelperText.tsx",
        kind: "import-statement",
        original: "./InputHelperText",
      },
    ],
    format: "esm",
  },
};

export const firstDuplicate = {
  "repo/examples/demo/src/index.tsx": {
    input: "repo/examples/demo/src/index.tsx",
    import: {
      input: "repo/examples/demo/src/App.tsx",
      original: "./App",
      kind: "import-statement",
    },
  },
  "repo/examples/demo/src/App.tsx": {
    input: "repo/examples/demo/src/App.tsx",
    import: {
      input: "repo/packages/react-admin/src/index.ts",
      original: "react-admin",
      kind: "import-statement",
    },
  },
  "repo/packages/react-admin/src/index.ts": {
    input: "repo/packages/react-admin/src/index.ts",
    import: {
      input: "repo/packages/ra-core/src/index.ts",
      original: "ra-core",
      kind: "import-statement",
    },
  },
  "repo/packages/ra-core/src/index.ts": {
    input: "repo/packages/ra-core/src/index.ts",
    import: {
      input: "repo/packages/ra-core/src/util/index.ts",
      original: "./util",
      kind: "import-statement",
    },
  },
  "repo/packages/ra-core/src/util/index.ts": {
    input: "repo/packages/ra-core/src/util/index.ts",
    import: {
      input: "repo/packages/ra-core/src/util/ComponentPropType.ts",
      original: "./ComponentPropType",
      kind: "import-statement",
    },
  },
  "repo/packages/ra-core/src/util/ComponentPropType.ts": {
    input: "repo/packages/ra-core/src/util/ComponentPropType.ts",
    import: {
      input: "repo/node_modules/react-is/index.js",
      original: "react-is",
      kind: "import-statement",
    },
  },
};

export const file50Path = {
  "repo/examples/demo/src/App.tsx": {
    import: {
      input: "repo/examples/demo/src/products/index.tsx",
      kind: "import-statement",
      original: "./products",
    },
    input: "repo/examples/demo/src/App.tsx",
  },
  "repo/examples/demo/src/index.tsx": {
    import: {
      input: "repo/examples/demo/src/App.tsx",
      kind: "import-statement",
      original: "./App",
    },
    input: "repo/examples/demo/src/index.tsx",
  },
  "repo/examples/demo/src/products/index.tsx": {
    import: {
      input: "repo/examples/demo/src/products/ProductEdit.tsx",
      kind: "import-statement",
      original: "./ProductEdit",
    },
    input: "repo/examples/demo/src/products/index.tsx",
  },
};

export const statsData: Result = {
  data: {
    files: 2842,
    totalBytes: 9238085,
    esmBytes: 6765535,
    cjsBytes: 2455561,
    otherBytes: 16989,
    nodeModules: 2215,
    nodeModulesBytes: 7559470,
    countOut: 4,
    bytesOut: 3157492,
  },
  slowDownloadTime: 180,
  fastDownloadTime: 10,
  avgFileSize: 3251,
  avgFileSizeNodeModules: 3413,
};
