import * as fs from "node:fs";
import * as path from "node:path";
import { analyze } from "../src/analyze";
import type { Metafile } from "../src/metafile";
import { statsData } from "./testData";

const consoleSpy = jest.spyOn(global.console, "log");
const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const metafilePath = path.join(fixturePath, "meta.json");
const defaultResultPath = path.join(fixturePath, "meta_result.json");
const customResultPath = path.join(process.cwd(), "custom_result.json");

describe("analyze()", () => {
  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
    fs.unlinkSync(defaultResultPath);
    fs.unlinkSync(customResultPath);
  });

  test("print analysis information", () => {
    analyze(metafilePath, false, "");
    expect(consoleSpy).toBeCalledTimes(1);
  });

  test("writes analysis information as JSON", () => {
    analyze(metafilePath, false, undefined, "");
    const content = fs.readFileSync(defaultResultPath, "utf-8");
    expect(fs.existsSync(defaultResultPath)).toBe(true);
    const file: Metafile = JSON.parse(content);
    expect(file).toEqual(statsData);

    analyze(metafilePath, false, undefined, customResultPath);
    const customContent = fs.readFileSync(customResultPath, "utf-8");
    expect(fs.existsSync(customResultPath)).toBe(true);
    const customFile: Metafile = JSON.parse(customContent);
    expect(customFile).toEqual(statsData);
  });
});
