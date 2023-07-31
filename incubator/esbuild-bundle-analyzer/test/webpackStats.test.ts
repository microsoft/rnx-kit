import * as fs from "node:fs";
import * as path from "node:path";
import type { WebpackStats } from "../src/types";
import { webpackStats } from "../src/webpackStats";

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
    const metafile = JSON.parse(fs.readFileSync(metafilePath, "utf-8"));
    webpackStats(metafile, path.dirname(metafilePath), false, statsPath);
    const content = fs.readFileSync(statsPath, "utf-8");

    expect(fs.existsSync(statsPath)).toBe(true);
    const file: WebpackStats = JSON.parse(content);
    expect(file.time).toBe(0);
    expect(file.builtAt).toBeLessThanOrEqual(Date.now());
    expect(file.outputPath).toBe(path.resolve(fixturePath));
    expect(file.chunks.length).toBe(4);
    expect(file.modules).not.toEqual([]);
    expect(file.errors).toEqual([]);
    expect(file.warnings).toEqual([]);
  });
});
