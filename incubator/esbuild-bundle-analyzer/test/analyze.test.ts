import path from "path";
import { analyze } from "../src/analyze";
import * as fs from "fs";
import type { Metafile } from "../src/metafile";
import type { WebpackStats } from "../src/types";
import { statsData } from "./testData";

const consoleSpy = jest.spyOn(global.console, "log");
const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const metafilePath = path.join(fixturePath, "meta.json");
const defaultStatsPath = path.join(fixturePath, "stats.json");
const customStatsPath = path.join(fixturePath, "custom_stats.json");
const defaultResultPath = path.join(fixturePath, "result.json");
const customResultPath = path.join(process.cwd(), "custom_result.json");

describe("analyze()", () => {
  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
    fs.unlinkSync(defaultResultPath);
    fs.unlinkSync(customResultPath);
    fs.unlinkSync(defaultStatsPath);
    fs.unlinkSync(customStatsPath);
  });

  test("print analysis information", () => {
    analyze(metafilePath, false, "");
    expect(consoleSpy).toBeCalledTimes(1);
  });

  test("writes analysis information as JSON", () => {
    analyze(metafilePath, false, "", undefined, "");
    const content = fs.readFileSync(defaultResultPath, "utf-8");
    expect(fs.existsSync(defaultResultPath)).toBe(true);
    const file: Metafile = JSON.parse(content);
    expect(file).toEqual(statsData);

    analyze(metafilePath, false, "", undefined, customResultPath);
    const customContent = fs.readFileSync(customResultPath, "utf-8");
    expect(fs.existsSync(customResultPath)).toBe(true);
    const customFile: Metafile = JSON.parse(customContent);
    expect(customFile).toEqual(statsData);
  });

  test("generates and writes a Webpack stats file", () => {
    analyze(metafilePath, false, "", "");
    const content = fs.readFileSync(defaultStatsPath, "utf-8");
    expect(fs.existsSync(defaultStatsPath)).toBe(true);
    const file: WebpackStats = JSON.parse(content);
    expect(file.time).toBe(0);
    expect(file.builtAt).toBeLessThanOrEqual(Date.now());
    expect(file.outputPath).toBe(path.resolve(fixturePath));
    expect(file.chunks.length).toBe(4);
    expect(file.modules).not.toEqual([]);
    expect(file.errors).toEqual([]);
    expect(file.warnings).toEqual([]);

    analyze(metafilePath, false, "", customStatsPath);
    const customContent = fs.readFileSync(customStatsPath, "utf-8");
    expect(fs.existsSync(customStatsPath)).toBe(true);
    const customFile: WebpackStats = JSON.parse(customContent);
    expect(customFile.time).toBe(0);
    expect(customFile.builtAt).toBeLessThanOrEqual(Date.now());
    expect(customFile.outputPath).toBe(path.resolve(fixturePath));
    expect(customFile.chunks.length).toBe(4);
    expect(customFile.modules).not.toEqual([]);
    expect(customFile.errors).toEqual([]);
    expect(customFile.warnings).toEqual([]);
  });
});
