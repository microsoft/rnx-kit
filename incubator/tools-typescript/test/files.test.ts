const fileStats = { active: 0, maxActive: 0, written: 0 };

function mockWriteFile(_name: string, _content: string) {
  return new Promise<void>((resolve) => {
    fileStats.active++;
    fileStats.maxActive = Math.max(fileStats.active, fileStats.maxActive);
    setTimeout(() => {
      fileStats.active--;
      fileStats.written++;
      resolve();
    }, 10);
  });
}

function resetFileStats() {
  fileStats.active = 0;
  fileStats.maxActive = 0;
  fileStats.written = 0;
}

jest.mock("fs", () => ({
  promises: {
    writeFile: mockWriteFile,
  },
}));

import { BatchWriter, Throttler } from "../src/files";

describe("BatchWriter", () => {
  const throttler = new Throttler(2, 2);
  const writer = new BatchWriter("rootDir", throttler);

  beforeEach(() => {
    resetFileStats();
  });

  it("should write files in batches", async () => {
    writer.writeFile("file1.txt", "content1");
    writer.writeFile("file2.txt", "content2");
    writer.writeFile("file3.txt", "content3");
    writer.writeFile("file4.txt", "content4");
    writer.writeFile("file5.txt", "content5");
    await writer.finish();

    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(5);
    expect(fileStats.maxActive).toBe(2);
  });
});
