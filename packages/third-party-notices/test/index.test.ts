import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe } from "node:test";
import { fileURLToPath } from "node:url";
import { runIntegrationTests } from "./integrationHelper.ts";

describe("ThirdPartyNotices", () => {
  const rootPath = fileURLToPath(
    new URL("./__fixtures__/bundle/", import.meta.url)
  );

  const graph = {
    dependencies: new Map([
      ["node_modules/@contoso/module/index.ts", {}],
      ["node_modules/@contoso/module-2/index.ts", {}],
      ["src/index.ts", {}],
      ["virtual:metro:__rnx_prelude__", {}],
    ]),
  } as unknown as Parameters<MetroPlugin>[2];

  const serializerOpts = {
    dev: false,
    projectRoot: rootPath,
    sourceMapUrl: "main.jsbundle.map",
  } as Parameters<MetroPlugin>[3];

  let ThirdPartyNotices: typeof import("../src/index.ts").default;

  before(() => {
    global.require = createRequire(new URL("../src/index.ts", import.meta.url));
    // @ts-expect-error `module` is not defined in ES module scope
    global.module = {};
    ThirdPartyNotices = require("./index.ts").default;
  });

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
    // @ts-expect-error `module` is not defined in ES module scope
    global.module = undefined;
  });

  runIntegrationTests((opts) => {
    return new Promise((resolve) => {
      ThirdPartyNotices(opts, {
        ...fs,
        writeFileSync(_, data) {
          resolve(JSON.parse(data.toString()));
        },
      })(".", [], graph, serializerOpts);
    });
  });
});
