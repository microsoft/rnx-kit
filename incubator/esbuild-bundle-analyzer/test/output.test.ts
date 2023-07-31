import * as fs from "node:fs";
import * as path from "node:path";
import { readMetafile } from "../src/compare";
import { generateGraph, getWhyDuplicatesInBundle } from "../src/duplicates";
import type { Metafile } from "../src/metafile";
import {
  output,
  outputDiffToConsole,
  outputWhyDuplicateInBundle,
} from "../src/output";
import { stats } from "../src/stats";
import type { Result } from "../src/types";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const statsDataFilePath = path.join(process.cwd(), "statsTest.json");
const statsData: Result = {
  data: {
    files: 2840,
    totalBytes: 9207283,
    esmBytes: 6765535,
    cjsBytes: 2424759,
    otherBytes: 16989,
    nodeModules: 2213,
    nodeModulesBytes: 7528668,
    countOut: 4,
    bytesOut: 3157492,
  },
  buildTime: 0,
  slowDownloadTime: 180,
  fastDownloadTime: 10,
  avgFileSize: 3242,
  avgFileSizeNodeModules: 3402,
};

describe("outputWhyDuplicateInBundle()", () => {
  const consoleSpy = jest.spyOn(global.console, "log");

  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
    fs.unlinkSync(statsDataFilePath);
  });

  test("prints nothing if no duplicates are found", () => {
    const metafilePath = path.join(fixturePath, "empty_meta.json");
    const metafile = readMetafile(metafilePath);
    const graph = generateGraph(metafile);
    const paths = getWhyDuplicatesInBundle(metafile, graph);
    outputWhyDuplicateInBundle(paths, "");

    expect(consoleSpy).toBeCalledTimes(0);
    expect(paths).toEqual([]);
  });

  test("prints import paths causing the duplicates to be bundled", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    const metafile = readMetafile(metafilePath);
    const graph = generateGraph(metafile);
    const paths = getWhyDuplicatesInBundle(metafile, graph);
    outputWhyDuplicateInBundle(paths, "");

    expect(consoleSpy).toBeCalledTimes(109);
    expect(paths).not.toEqual([]);
  });

  test("writes analysis information as JSON", () => {
    output(statsData, "statsTest.json");
    const content = fs.readFileSync(statsDataFilePath, { encoding: "utf-8" });
    const file = JSON.parse(content) as Metafile;

    expect(file).toStrictEqual(statsData);
  });

  test("prints analysis information", () => {
    output(statsData);
    expect(consoleSpy).toBeCalledTimes(1);
  });

  test("prints the difference", () => {
    const baselinePath = path.join(fixturePath, "meta.json");
    const baseline = readMetafile(baselinePath);
    const baselineStats = stats(baseline);

    const candidatePath = path.join(fixturePath, "empty_meta.json");
    const candidate = readMetafile(candidatePath);
    const candidateStats = stats(candidate);

    outputDiffToConsole(baselineStats, candidateStats);
    expect(consoleSpy).toBeCalledTimes(1);

    outputDiffToConsole(candidateStats, baselineStats);
    expect(consoleSpy).toBeCalledTimes(2);

    outputDiffToConsole(baselineStats, baselineStats);
    expect(consoleSpy).toBeCalledTimes(3);
  });
});
