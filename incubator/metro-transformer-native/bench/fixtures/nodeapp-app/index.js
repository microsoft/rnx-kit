// Bench bundle entry. Imports the nodeapp public API via the TypeScript
// SOURCE entry (`@rnx-kit/test-fixtures/nodeapp/cli` → `src/nodeapp/cli.ts`)
// so Metro actually feeds the transformer raw TS/TSX/MTS source instead of
// the prebuilt JS in lib/. Without this routing the native transformer has
// almost no work to do and the measurement is meaningless.
//
// The harness pulls `runApp`/`samples`/`getSample` off `globalThis.__nodeapp`
// after evaluating the bundle in a vm sandbox.

import {
  getSample,
  runApp,
  samples,
} from "@rnx-kit/test-fixtures/nodeapp/cli";

globalThis.__nodeapp = { runApp, getSample, samples };

// Defensive touch so a tree-shaker doesn't decide the whole import is
// dead. The bench harness asserts on the contents after evaluating.
if (typeof samples?.length !== "number") {
  throw new Error("nodeapp: samples not loaded");
}
