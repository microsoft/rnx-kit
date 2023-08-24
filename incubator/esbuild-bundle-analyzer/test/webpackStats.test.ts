import * as fs from "node:fs";
import * as path from "node:path";
import type { WebpackStats } from "../src/types";
import { webpackStats, getCleanUserRequest } from "../src/webpackStats";

const consoleSpy = jest.spyOn(global.console, "log");
const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const statsPath = path.join(fixturePath, "webpack-stats.json");

describe("webpackStats()", () => {
  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
    fs.unlinkSync(statsPath);
  });

  test("webpackStats", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    webpackStats(metafilePath, statsPath, false);
    const content = fs.readFileSync(statsPath, "utf-8");

    expect(fs.existsSync(statsPath)).toBe(true);
    const file: WebpackStats = JSON.parse(content);
    expect(file.time).toBe(0);
    expect(file.builtAt).toBeLessThanOrEqual(Date.now());
    expect(file.outputPath).toBe(path.resolve(metafilePath));
    expect(file.chunks.length).toBe(4);
    expect(file.modules).not.toEqual([]);
    expect(file.errors).toEqual([]);
    expect(file.warnings).toEqual([]);
  });
});

describe("getCleanUserRequest()", () => {
  test("getCleanUserRequest", () => {
    const res = "@rnx-kit/test";
    expect(getCleanUserRequest(`${res}/src/index.ts`)).toBe(res);
    expect(getCleanUserRequest(`${res}/src/index.tsx`)).toBe(res);
    expect(getCleanUserRequest(`${res}/src/index.jsx`)).toBe(res);
    expect(getCleanUserRequest(`${res}/src/index.native.ts`)).toBe(res);
    expect(getCleanUserRequest(`${res}/dist/index.android.ts`)).toBe(res);
    expect(getCleanUserRequest(`${res}/build/index.ios.ts`)).toBe(res);
    expect(getCleanUserRequest(`${res}/lib/index.js`)).toBe(res);
    expect(getCleanUserRequest(`${res}/lib/index`)).toBe(res);
    expect(getCleanUserRequest(`${res}/lib/index.native.js`)).toBe(res);
    expect(getCleanUserRequest(`${res}/file.js`)).toBe(`${res}/file.js`);
    expect(getCleanUserRequest(`react/src/file.js`)).toBe(`react/src/file.js`);
    expect(getCleanUserRequest(undefined)).toBe("");
    expect(getCleanUserRequest("")).toBe("");
  });
});
