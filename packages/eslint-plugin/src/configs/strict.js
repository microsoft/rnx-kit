// @ts-check
"use strict";

module.exports = [
  ...require("./recommended"),
  {
    rules: {
      "@rnx-kit/no-const-enum": "error",
      "@rnx-kit/no-export-all": "error",
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
];
