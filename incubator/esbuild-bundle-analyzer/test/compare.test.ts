import path from "node:path";
import { compare, readMetafile } from "../src/compare";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

describe("compare()", () => {
  const consoleSpy = jest.spyOn(global.console, "log");

  beforeEach(() => {
    consoleSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("outputs the comparison", () => {
    const baseline = path.join(fixturePath, "meta.json");
    const candidate = path.join(fixturePath, "empty_meta.json");
    compare(baseline, candidate);

    expect(consoleSpy).toBeCalledTimes(1);
  });

  test("throws if metafile path is invalid", () => {
    const invalid_path = path.join(fixturePath, "no_file.json");
    const valid_path = path.join(fixturePath, "meta.json");

    expect(() => {
      compare(invalid_path, invalid_path);
    }).toThrow();

    expect(() => {
      compare(valid_path, invalid_path);
    }).toThrow();

    expect(() => {
      compare(invalid_path, valid_path);
    }).toThrow();
  });
});

describe("readMetafile()", () => {
  test("returns a metafile object if metafile is empty", () => {
    const metafilePath = path.join(fixturePath, "empty_meta.json");

    expect(readMetafile(metafilePath)).toStrictEqual({
      inputs: {},
      outputs: {},
    });
  });

  test("returns a metafile object", () => {
    const metafilePath = path.join(fixturePath, "meta.json");
    const metafile = readMetafile(metafilePath);

    expect(Object.keys(metafile.inputs).length).toBe(2842);
    expect(Object.keys(metafile.outputs).length).toBe(5);

    expect(
      metafile.inputs["repo/packages/ra-core/src/controller/button/index.ts"]
    ).toEqual({
      bytes: 225,
      imports: [
        {
          path: "repo/packages/ra-core/src/controller/button/useDeleteWithUndoController.tsx",
          kind: "import-statement",
          original: "./useDeleteWithUndoController",
        },
        {
          path: "repo/packages/ra-core/src/controller/button/useDeleteWithConfirmController.tsx",
          kind: "import-statement",
          original: "./useDeleteWithConfirmController",
        },
      ],
      format: "esm",
    });
    expect(metafile.inputs["repo/node_modules/react/index.js"]).toEqual({
      bytes: 190,
      imports: [
        {
          path: "repo/node_modules/react/cjs/react.production.min.js",
          kind: "require-call",
          original: "./cjs/react.production.min.js",
        },
      ],
      format: "cjs",
    });

    expect(metafile.outputs["dist/index.js.map"].bytes).toBe(13976854);
    expect(metafile.outputs["dist/index.js"].bytes).toBe(3143261);
  });

  test("throws if a metafile is invalid", () => {
    const metafilePath = path.join(fixturePath, "no_file.json");

    expect(() => {
      readMetafile(metafilePath);
    }).toThrow();
  });
});
