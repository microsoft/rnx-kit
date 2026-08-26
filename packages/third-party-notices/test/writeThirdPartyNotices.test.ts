import * as fs from "node:fs";
import { createRequire } from "node:module";
import { after, before, describe } from "node:test";
import { writeThirdPartyNotices } from "../src/write-third-party-notices.ts";
import { runIntegrationTests } from "./integrationHelper.ts";

describe("writeThirdPartyNotices", () => {
  before(() => {
    global.require = createRequire(
      new URL("../src/write-third-party-notices.ts", import.meta.url)
    );
  });

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  runIntegrationTests(async (opts) => {
    let result: Record<string, unknown>;
    await writeThirdPartyNotices(opts, {
      ...fs,
      writeFileSync(_, data) {
        result = JSON.parse(data.toString());
      },
    });
    // @ts-expect-error `result` should be written before we return
    return result;
  });
});
