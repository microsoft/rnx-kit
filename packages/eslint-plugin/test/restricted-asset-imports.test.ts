import * as fs from "node:fs";
import rule from "../src/rules/restricted-asset-imports.js";
import { makeRuleTester } from "./RuleTester.ts";

describe("asset imports must follow a set of rules", () => {
  const E_LOWERCASE = { messageId: "lowercase" };
  const E_LOWERCASEDISK = { messageId: "lowercaseDisk" };
  const E_MISMATCH = { messageId: "mismatch" };
  const E_NOSUCHFILE = { messageId: "noSuchFile" };

  const ruleTester = makeRuleTester();

  ruleTester.run("restricted-asset-imports", rule, {
    valid: [
      '"./assets/Image.png";',
      'import t from "module.png";',
      'import t from "./types";',
      'import t from "./types.cjs";',
      'import t from "./types.cts";',
      'import t from "./types.js";',
      'import t from "./types.jsx";',
      'import t from "./types.mjs";',
      'import t from "./types.mts";',
      'import t from "./types.ts";',
      'import t from "./types.tsx";',
      {
        code: 'import i from "./assets/image.png";',
        options: [{ exists: false }],
      },
      {
        code: 'import i from "./assets/Image.png";',
        options: [{ extensions: [".jpg"], exists: false }],
      },
      {
        code: 'import i from "./assets/Image.png";',
        options: [{ lowercase: false, exists: false }],
      },
      {
        code: 'const i = import("./assets/image.png");',
        options: [{ exists: false }],
      },
      {
        code: 'const i = import("./assets/Image.png");',
        options: [{ extensions: [".jpg"], exists: false }],
      },
      {
        code: 'const i = import("./assets/Image.png");',
        options: [{ lowercase: false, exists: false }],
      },
      {
        code: 'const i = require("./assets/image.png");',
        options: [{ exists: false }],
      },
      {
        code: 'const i = require("./assets/Image.png");',
        options: [{ extensions: [".jpg"], exists: false }],
      },
      {
        code: 'const i = require("./assets/Image.png");',
        options: [{ lowercase: false, exists: false }],
      },
    ],
    invalid: [
      {
        code: 'import i from "./assets/Image.png";',
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'import i from "./assets/Image.png";',
        options: [{ extensions: [".png"] }],
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'import i from "./assets/Image.png";',
        options: [{ extensions: [".png"], exists: false }],
        errors: [E_LOWERCASE],
      },
      {
        code: 'const i = import("./assets/Image.png");',
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'const i = import("./assets/Image.png");',
        options: [{ extensions: [".png"] }],
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'const i = import("./assets/Image.png");',
        options: [{ extensions: [".png"], exists: false }],
        errors: [E_LOWERCASE],
      },
      {
        code: 'const i = require("./assets/Image.png");',
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'const i = require("./assets/Image.png");',
        options: [{ extensions: [".png"] }],
        errors: [E_LOWERCASE, E_NOSUCHFILE],
      },
      {
        code: 'const i = require("./assets/Image.png");',
        options: [{ extensions: [".png"], exists: false }],
        errors: [E_LOWERCASE],
      },
    ],
  });

  // These tests only work on case-sensitive file systems
  const thisFile = __filename;
  if (fs.existsSync(thisFile.toUpperCase())) {
    ruleTester.run("restricted-asset-imports (case-insensitive)", rule, {
      valid: [
        {
          code: 'import m from "./README.md";',
          options: [{ lowercase: false }],
        },
      ],
      invalid: [
        {
          code: 'import m from "./readme.md";',
          errors: [E_LOWERCASEDISK],
        },
        {
          code: 'import m from "./ReadMe.md";',
          errors: [E_LOWERCASE, E_LOWERCASEDISK],
        },
        {
          code: 'import m from "./ReadMe.md";',
          options: [{ lowercase: false }],
          errors: [E_MISMATCH],
        },
      ],
    });
  }
});
