import path from "path";
import { readMetafile } from "../src/compare";
import {
  generateGraph,
  getDuplicates,
  getWhyDuplicatesInBundle,
  getWhyFileInBundle,
} from "../src/duplicates";
import {
  file50Path,
  firstDuplicate,
  inputWithDuplicates,
  inputWithoutDuplicates,
  repoRoot,
} from "./testData";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

jest.mock("fs");
jest.mock("@rnx-kit/tools-node/package");

// Under normal circumstances, this extra copy of '@react-native/polyfills'
// should not be installed.
// Copied from metro-plugin-duplicates-checker/test/checkForDuplicatePackages.test.ts
const extraPolyfills = `${repoRoot.replace(
  /\\/g,
  "/"
)}/packages/test-app/node_modules/@react-native/polyfills`;
require("@rnx-kit/tools-node/package").findPackageDir = jest
  .fn()
  .mockImplementation((startDir) => {
    switch (startDir) {
      // Under normal circumstances, this extra copy of '@react-native/polyfills'
      // should not be installed.
      case `${extraPolyfills}/index.js`:
        return extraPolyfills;
      default:
        return jest
          .requireActual("@rnx-kit/tools-node/package")
          .findPackageDir(startDir);
    }
  });
require("@rnx-kit/tools-node/package").readPackage = jest
  .fn()
  .mockImplementation((path) => {
    if (path.replace(/\\/g, "/").includes(extraPolyfills)) {
      return {
        name: "@react-native/polyfills",
        version: "1.0.0",
      };
    } else {
      return jest
        .requireActual("@rnx-kit/tools-node/package")
        .readPackage(path);
    }
  });

describe("generateGraph()", () => {
  test("generateGraph", () => {
    const metafile = readMetafile(path.join(fixturePath, "meta.json"));
    const graph = generateGraph(metafile);

    expect(Object.keys(graph.entryPoints).length).toBe(1);
    expect(graph.entryPoints).toEqual({
      "repo/examples/demo/src/index.tsx": "dist/index.js",
    });

    expect(Object.keys(graph.imports).length).toBe(2840);
    expect(graph.imports["repo/examples/demo/src/index.tsx"]).toEqual({
      input: "repo/examples/demo/src/index.tsx",
      original: undefined,
      kind: "entry-point",
    });
    expect(graph.imports["repo/examples/demo/src/App.tsx"]).toEqual({
      input: "repo/examples/demo/src/index.tsx",
      original: "./App",
      kind: "import-statement",
    });

    const emptyMetafile = readMetafile(
      path.join(fixturePath, "empty_meta.json")
    );
    const emptyGraph = generateGraph(emptyMetafile);

    expect(Object.keys(emptyGraph.entryPoints).length).toBe(0);
    expect(Object.keys(emptyGraph.imports).length).toBe(0);
  });
});

describe("getWhyFileInBundle()", () => {
  test("getWhyFileInBundle", () => {
    const metafile = readMetafile(path.join(fixturePath, "meta.json"));
    const graph = generateGraph(metafile);

    const noFile = getWhyFileInBundle(graph, "");
    expect(noFile).toEqual({});

    const entryPoint = getWhyFileInBundle(
      graph,
      Object.keys(graph.entryPoints)[0]
    );
    expect(entryPoint).toEqual({});

    const file = getWhyFileInBundle(graph, Object.keys(graph.imports)[50]);
    expect(file).toEqual(file50Path);

    const emptyMetafile = readMetafile(
      path.join(fixturePath, "empty_meta.json")
    );
    const emptyGraph = generateGraph(emptyMetafile);
    expect(getWhyFileInBundle(emptyGraph, "")).toEqual({});
  });
});

describe("getWhyDuplicatesInBundle()", () => {
  test("getWhyDuplicatesInBundle", () => {
    const noDuplicatesPath = path.join(fixturePath, "empty_meta.json");
    const metafileNoDuplicates = readMetafile(noDuplicatesPath);
    const graphNoDuplicates = generateGraph(metafileNoDuplicates);
    const noDuplicates = getWhyDuplicatesInBundle(
      metafileNoDuplicates,
      graphNoDuplicates
    );

    expect(Object.keys(noDuplicates).length).toBe(0);

    const metafilePath = path.join(fixturePath, "meta.json");
    const metafile = readMetafile(metafilePath);
    const graph = generateGraph(metafile);
    const duplicates = getWhyDuplicatesInBundle(metafile, graph);

    expect(Object.keys(duplicates).length).toBe(11);
    expect(duplicates[0]).toEqual(firstDuplicate);
  });
});

describe("getDuplicates()", () => {
  expect(getDuplicates(inputWithoutDuplicates, "")).toEqual({
    banned: 0,
    duplicates: 0,
  });

  expect(getDuplicates(inputWithDuplicates, "")).toEqual({
    banned: 0,
    duplicates: 1,
  });
});
