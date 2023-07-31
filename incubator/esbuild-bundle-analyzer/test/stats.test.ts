import * as path from "node:path";
import { readMetafile } from "../src/compare";
import { stats } from "../src/stats";
import type { Stats } from "../src/types";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const empty: Stats = {
  files: 0,
  totalBytes: 0,
  esmBytes: 0,
  cjsBytes: 0,
  otherBytes: 0,
  nodeModules: 0,
  nodeModulesBytes: 0,
  countOut: 0,
  bytesOut: 0,
};

describe("stats()", () => {
  test("returns stats object", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    const metafile = readMetafile(metafilePath);
    const data = stats(metafile);

    expect(data.files).toBe(2842);
    expect(data.totalBytes).toBe(9238085);
    expect(data.esmBytes).toBe(6765535);
    expect(data.cjsBytes).toBe(2455561);
    expect(data.otherBytes).toBe(16989);
    expect(data.nodeModules).toBe(2215);
    expect(data.nodeModulesBytes).toBe(7559470);
    expect(data.countOut).toBe(4);
    expect(data.bytesOut).toBe(3157492);
  });

  test("returns empty stats object if metafile is empty", () => {
    const metafilePath = path.join(fixturePath, "empty_meta.json");
    const metafile = readMetafile(metafilePath);

    expect(stats(metafile)).toStrictEqual(empty);
  });
});
