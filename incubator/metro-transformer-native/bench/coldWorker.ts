/**
 * Cold-start worker. Forked once per (transformer, file) probe.
 *
 * Receives a single { filename, src } message; loads the requested
 * transformer for the first time (so the cost includes require()-ing
 * @swc/core, hermes-parser, the babel preset, etc.); invokes transform
 * exactly once; reports wall time and heap delta.
 *
 * The wall-time measurement INCLUDES module load — that is the whole
 * point of the cold scenario.
 */

import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";

type WorkerInput = { filename: string; src: string };

const transformerKey = process.argv[2] as "native" | "baseline";
const require = createRequire(import.meta.url);

process.on("message", (input: WorkerInput) => {
  const heapBefore = process.memoryUsage().heapUsed;
  const t0 = performance.now();

  let transformerName: string;
  // oxlint-disable-next-line typescript/no-explicit-any
  let transform: (args: any) => any;

  if (transformerKey === "native") {
    const ctx = require("../lib/context.js") as {
      setTransformerPluginOptions: (o: Record<string, unknown>) => void;
    };
    ctx.setTransformerPluginOptions({});
    const mod = require("../lib/babelTransformer.js") as {
      // oxlint-disable-next-line typescript/no-explicit-any
      transform: (args: any) => any;
    };
    transformerName = "native-swc";
    transform = mod.transform;
  } else {
    const mod = require("@react-native/metro-babel-transformer") as {
      // oxlint-disable-next-line typescript/no-explicit-any
      transform: (args: any) => any;
    };
    transformerName = "baseline-rn";
    transform = mod.transform;
  }

  const args = {
    src: input.src,
    filename: input.filename,
    plugins: [],
    options: {
      dev: true,
      hot: false,
      minify: false,
      platform: "ios",
      projectRoot: process.cwd(),
      enableBabelRCLookup: true,
      enableBabelRuntime: false,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
    },
  };

  void transformerName; // captured for symmetry; reported by parent

  const r = transform(args);
  Promise.resolve(r)
    .then(() => {
      const wallMs = performance.now() - t0;
      const heapBytes = Math.max(
        0,
        process.memoryUsage().heapUsed - heapBefore
      );
      process.send?.({ wallMs, heapBytes });
      process.exit(0);
    })
    .catch((err) => {
      // oxlint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
});
