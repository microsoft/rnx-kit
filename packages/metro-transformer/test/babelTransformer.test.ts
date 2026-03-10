import type { CustomTransformerOptions } from "@rnx-kit/types-metro-config";
import type { BabelTransformerArgs } from "../src/babelTransformer.ts";
import { equal, match } from "node:assert/strict";
import Module from "node:module";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { getCacheKey, transform } from "../src/babelTransformer.ts";
import type { BabelFileResult } from "@babel/core";

const fixturesDir = path.join(__dirname, "__fixtures__");
const upstreamTransformerPath = path.join(
  fixturesDir,
  "upstreamTransformer.js",
);
const svgTransformerPath = path.join(fixturesDir, "svgTransformer.js");

/** Build a minimal BabelTransformerArgs — transform() only reads filename and customTransformerOptions. */
function makeArgs(
  filename: string,
  customTransformerOptions: CustomTransformerOptions,
): BabelTransformerArgs {
  return {
    filename,
    src: "",
    plugins: [],
    options: {
      customTransformOptions: {
        customTransformerOptions,
        rnxTransformer: { babelTransformerPath: "" },
      },
    },
  } as unknown as BabelTransformerArgs;
}

// ---------------------------------------------------------------------------
// getCacheKey
// ---------------------------------------------------------------------------

describe("getCacheKey", () => {
  it("returns a 32-character MD5 hex string", () => {
    match(getCacheKey(), /^[0-9a-f]{32}$/);
  });

  it("returns the same value on repeated calls", () => {
    equal(getCacheKey(), getCacheKey());
  });
});

// ---------------------------------------------------------------------------
// transform — transformer selection
// ---------------------------------------------------------------------------

type ResultWithTestData = BabelFileResult & {
  metadata: { transformer?: string; filename?: string };
};

describe("transform", () => {
  it("delegates to upstreamTransformerPath when babelTransformers is not set", async () => {
    const result = (await transform(
      makeArgs("index.js", { upstreamTransformerPath }),
    )) as ResultWithTestData;

    equal(result.metadata.transformer, "upstream");
  });

  it("delegates to upstreamTransformerPath when no babelTransformer pattern matches", async () => {
    const result = (await transform(
      makeArgs("index.js", {
        upstreamTransformerPath,
        babelTransformers: { "**/*.svg": svgTransformerPath },
      }),
    )) as ResultWithTestData;

    equal(result.metadata.transformer, "upstream");
  });

  it("delegates to the matching babelTransformer when a glob matches the filename", async () => {
    const result = (await transform(
      makeArgs("/project/src/icon.svg", {
        upstreamTransformerPath,
        babelTransformers: { "**/*.svg": svgTransformerPath },
      }),
    )) as ResultWithTestData;

    equal(result.metadata.transformer, "svg");
  });

  it("uses the first matching pattern when multiple patterns match", async () => {
    const result = (await transform(
      makeArgs("/project/icon.svg", {
        upstreamTransformerPath,
        // svg comes first — upstream is a catch-all that would also match
        babelTransformers: {
          "**/*.svg": svgTransformerPath,
          "**/*": upstreamTransformerPath,
        },
      }),
    )) as ResultWithTestData;

    equal(result.metadata.transformer, "svg");
  });

  it("passes args through to the selected transformer", async () => {
    const filename = "/project/src/special.svg";
    const result = (await transform(
      makeArgs(filename, {
        upstreamTransformerPath,
        babelTransformers: { "**/*.svg": svgTransformerPath },
      }),
    )) as ResultWithTestData;

    equal(result.metadata.filename, filename);
  });
});

// ---------------------------------------------------------------------------
// transform — upstreamTransformerAliases
// ---------------------------------------------------------------------------

describe("alias interception", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = Module as any;
  let savedResolveFilename: (...args: unknown[]) => string;

  before(() => {
    savedResolveFilename = mod._resolveFilename;
  });

  after(() => {
    mod._resolveFilename = savedResolveFilename;
  });

  it("patches Module._resolveFilename to redirect aliased requests to the upstream path", async () => {
    const resolvedUpstream = require.resolve(upstreamTransformerPath);

    await transform(
      makeArgs("index.js", {
        upstreamTransformerPath,
        upstreamTransformerAliases: ["some-fake-upstream-transformer"],
      }),
    );

    equal(
      mod._resolveFilename("some-fake-upstream-transformer"),
      resolvedUpstream,
    );
  });

  it("does not affect resolution of non-aliased requests", () => {
    const resolvedMicromatch = require.resolve("micromatch");
    // pass the current module as parent so resolution has a context
    equal(mod._resolveFilename("micromatch", module), resolvedMicromatch);
  });
});
