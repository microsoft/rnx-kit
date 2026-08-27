import { mockFS } from "@rnx-kit/tools-filesystem/mocks";
import { equal } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ensureBabelConfig } from "../src/babel.ts";

describe("ensureBabelConfig", () => {
  const metroConfig = { projectRoot: path.join(process.cwd(), "my-app") };

  it("does not warn when the project has its own Babel config", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const fs = mockFS({ "my-app/babel.config.js": "module.exports = {};" });
    ensureBabelConfig(metroConfig, fs);

    equal(warnSpy.mock.callCount(), 0);
  });

  it("does not warn when there is no Babel config anywhere", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const fs = mockFS({ "my-app/index.js": "" });
    ensureBabelConfig(metroConfig, fs);

    equal(warnSpy.mock.callCount(), 0);
  });

  it("warns when a Babel config only exists in the current directory", (t) => {
    const warnSpy = t.mock.method(console, "warn", () => undefined);

    const fs = mockFS({ "my-app/index.js": "", "babel.config.js": "{}" });
    ensureBabelConfig(metroConfig, fs);

    equal(warnSpy.mock.callCount(), 1);
  });
});
