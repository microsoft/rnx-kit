import { deepEqual } from "node:assert/strict";
import * as path from "node:path";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import type { WriteThirdPartyNoticesOptions } from "../src/types";

type Extractor = (
  opts: WriteThirdPartyNoticesOptions
) => Promise<Record<string, unknown>>;

export function runIntegrationTests(extract: Extractor) {
  const rootPath = fileURLToPath(
    new URL("./__fixtures__/bundle/", import.meta.url)
  );

  const baseOpts = {
    rootPath,
    sourceMapFile: path.join(rootPath, "main.jsbundle.map"),
    json: true,
    outputFile: "<output>",
  };

  it("aggregates license texts from the graph", async () => {
    const result = await extract(baseOpts);

    deepEqual(result, {
      packages: [
        {
          copyright: "Copyright (c) Contoso Corporation.",
          license: "Fair",
          name: "@contoso/module",
          version: "0.0.0-dev",
        },
        {
          copyright: "Copyright (c) Contoso Corporation.",
          license: "Fair",
          name: "@contoso/module-2",
          version: "0.0.0-dev",
        },
      ],
    });
  });

  it("honors ignored scopes", async () => {
    const opts = { ...baseOpts, ignoreScopes: ["@contoso"] };
    const result = await extract(opts);

    deepEqual(result, { packages: [] });
  });

  it("honors ignored modules", async () => {
    const opts = { ...baseOpts, ignoreModules: ["@contoso/module"] };
    const result = await extract(opts);

    deepEqual(result, {
      packages: [
        {
          copyright: "Copyright (c) Contoso Corporation.",
          license: "Fair",
          name: "@contoso/module-2",
          version: "0.0.0-dev",
        },
      ],
    });
  });
}
