import { ensureDir } from "../../src/helpers/filesystem";

describe("ensureDir()", () => {
  it("passes the correct options to `fs.mkdir`", () => {
    let options = {};
    const fsMock = {
      mkdirSync: (_, mkdirOptions) => (options = mkdirOptions),
    } as typeof import("node:fs");
    ensureDir("", fsMock);
    expect(options).toMatchObject({ recursive: true, mode: 0o755 });
  });
});
