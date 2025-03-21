import { createAsyncThrottler, createAsyncWriter } from "../src/files.ts";

const fileStats = { active: 0, maxActive: 0, written: 0, failon: -1 };

function mockWriteFile(_name: string, _content: string) {
  return new Promise<void>((resolve, reject) => {
    fileStats.active++;
    fileStats.maxActive = Math.max(fileStats.active, fileStats.maxActive);
    setTimeout(() => {
      fileStats.active--;
      if (fileStats.written === fileStats.failon) {
        fileStats.failon = -1;
        reject(new Error("test error"));
      } else {
        fileStats.written++;
        resolve();
      }
    }, 10);
  });
}

function awaitableTimeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

jest.mock("node:fs", () => ({
  mkdirSync: jest.fn(),
  promises: {
    writeFile: mockWriteFile,
  },
}));

describe("BatchWriter", () => {
  const throttler = createAsyncThrottler(2, 2);

  beforeEach(() => {
    fileStats.active = 0;
    fileStats.maxActive = 0;
    fileStats.written = 0;
    fileStats.failon = -1;
  });

  afterEach(() => {
    //jest.spyOn(promises, "writeFile").mockRestore();
  });

  it("should write files in batches", async () => {
    const writer = createAsyncWriter("rootDir", throttler);
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

  it("should handle errors", async () => {
    const writer = createAsyncWriter("rootDir", throttler);
    fileStats.failon = 3;
    writer.writeFile("file1.txt", "content1");
    writer.writeFile("file2.txt", "content2");
    writer.writeFile("file3.txt", "content3");
    writer.writeFile("file4.txt", "content4");
    writer.writeFile("file5.txt", "content5");
    await expect(writer.finish()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"test error"`
    );

    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(4);
    expect(fileStats.maxActive).toBe(2);
  });

  it("should restart the queue", async () => {
    const writer = createAsyncWriter("rootDir", throttler);
    writer.writeFile("file1.txt", "content1");
    writer.writeFile("file2.txt", "content2");
    await awaitableTimeout(30);
    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(2);
    writer.writeFile("file3.txt", "content3");
    writer.writeFile("file4.txt", "content4");
    writer.writeFile("file5.txt", "content5");
    await writer.finish();

    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(5);
    expect(fileStats.maxActive).toBe(2);
  });

  it("should return when nothing is written", async () => {
    const writer = createAsyncWriter("rootDir", throttler);
    await writer.finish();
    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(0);
    expect(fileStats.maxActive).toBe(0);
  });

  it("should be able to write and have finish called twice", async () => {
    const writer = createAsyncWriter("rootDir", throttler);
    writer.writeFile("file1.txt", "content1");
    writer.writeFile("file2.txt", "content2");
    await writer.finish();
    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(2);
    writer.writeFile("file3.txt", "content3");
    writer.writeFile("file4.txt", "content4");
    writer.writeFile("file5.txt", "content5");
    await writer.finish();
    expect(fileStats.active).toBe(0);
    expect(fileStats.written).toBe(5);
  });
});
