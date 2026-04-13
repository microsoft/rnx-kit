import { getFormatter } from "@rnx-kit/reporter";
import { describe, it } from "node:test";
import { getFixtures } from "./fixtures";

const fixtures = getFixtures();
const fileCache: Record<string, ReturnType<typeof fixtures.getFileData>> = {};
const files = fixtures.getFiles();
const formatter = getFormatter();
const perfLabel = formatter.greenBright("PERF");

function getFile(file: string) {
  if (!fileCache[file]) {
    fileCache[file] = fixtures.getFileData(file);
  }
  return fileCache[file];
}

describe("quick performance test", () => {
  it("loads all src files", () => {
    const start = performance.now();
    for (const file of files) {
      const data = getFile(file);
      data.args.src;
    }
    const end = performance.now();
    console.log(
      `${perfLabel}: Loaded src + args: ${(end - start).toFixed(0)} ms`
    );
  });

  it("parses all files with Babel", () => {
    const start = performance.now();
    for (const file of files) {
      const data = getFile(file);
      data.babelAst;
    }
    const end = performance.now();
    console.log(
      `${perfLabel}: Parsed with Babel: ${(end - start).toFixed(0)} ms`
    );
  });

  it("parses all files with OXC", () => {
    const start = performance.now();
    for (const file of files) {
      const data = getFile(file);
      data.oxcAst;
    }
    const end = performance.now();
    console.log(
      `${perfLabel}: Parsed + converted to Babel with OXC: ${(end - start).toFixed(0)} ms`
    );
  });
});
