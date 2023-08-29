import * as fs from "node:fs";
import * as path from "node:path";
import type { WebpackStats } from "../src/types";
import { removeNamespace, transform } from "../src/webpackStats";

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

  test("webpackStats with statsPath", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    transform(metafilePath, statsPath);
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

  test("webpackStats without statsPath", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    const result = transform(metafilePath);
    expect(result?.time).toBe(0);
    expect(result?.builtAt).toBeLessThanOrEqual(Date.now());
    expect(result?.outputPath).toBe(path.resolve(metafilePath));
    expect(result?.chunks.length).toBe(4);
    expect(result?.modules).not.toEqual([]);
    expect(result?.errors).toEqual([]);
    expect(result?.warnings).toEqual([]);
  });
});

describe("removePrefix()", () => {
  test("removes prefix", () => {
    const path = "@rnx-kit/test/src/index.ts";
    const winPath = "@rnx-kit\\test\\src\\index.ts";

    expect(removeNamespace(`:${path}`)).toBe(path);
    expect(removeNamespace(`namespace:${path}`)).toBe(path);
    expect(removeNamespace(`namespace:metro:${path}`)).toBe(path);
    expect(removeNamespace(`:${winPath}`)).toBe(winPath);
    expect(removeNamespace(`namespace:${winPath}`)).toBe(winPath);
    expect(removeNamespace(`namespace:metro:${winPath}`)).toBe(winPath);

    expect(removeNamespace(`C:\\${winPath}`)).toBe(`C:\\${winPath}`);
    expect(removeNamespace(`namespace:C:\\${winPath}`)).toBe(`C:\\${winPath}`);
    expect(removeNamespace(`ns:metro:D:\\${winPath}`)).toBe(`D:\\${winPath}`);
  });
});
