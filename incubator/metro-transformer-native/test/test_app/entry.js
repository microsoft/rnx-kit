// Bundle entry. Imports the nodeapp public API via the TypeScript SOURCE
// entry (`@rnx-kit/test-fixtures/nodeapp/source` → `src/nodeapp/index.ts`)
// so Metro actually feeds the transformer raw TS/MTS source instead of the
// prebuilt JS in `lib/`. Without this routing the native transformer has
// almost no work to do and the measurement is meaningless.
//
// We deliberately do NOT use `./nodeapp/cli` here — that entry's `cli.ts`
// runs `await main()` at module top-level when invoked as a script, which
// Metro bundles into a sync module factory and turns into a SyntaxError
// when the bundle is evaluated.
//
// The harness pulls `runApp`/`samples`/`getSample` off `globalThis.__nodeapp`
// after evaluating the bundle in a vm sandbox.

import { getSample, runApp, samples } from "@rnx-kit/test-fixtures/nodeapp/source";

globalThis.__nodeapp = { runApp, getSample, samples };

// Defensive touch so a tree-shaker doesn't decide the whole import is dead.
// The harness asserts on the contents after evaluating.
if (typeof samples?.length !== "number") {
  throw new Error("nodeapp: samples not loaded");
}

export { getSample, runApp, samples };

