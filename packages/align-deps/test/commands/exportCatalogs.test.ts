import { afterEach } from "node:test";
import { exportCatalogs as exportCatalogsActual } from "../../src/commands/exportCatalogs.ts";
import type { Preset } from "../../src/types.ts";

describe("exportCatalogs()", () => {
  const fs = require("../__mocks__/fs.js");

  const preset = {
    "0.82": {
      react: {
        name: "react",
        version: "19.1.1",
      },
      core: {
        name: "react-native",
        version: "^0.82.0",
      },
    },
    "1.0": {
      react: {
        name: "react",
        version: "19.2.0",
      },
      core: {
        name: "react-native",
        version: "^1.0.0",
      },
    },
  } as unknown as Preset;

  function exportCatalogs(dst: string, preset: Preset) {
    return exportCatalogsActual(dst, preset, fs);
  }

  afterEach(() => {
    fs.__setMockContent({});
    fs.__setMockFileWriter(undefined);
  });

  it("throws for unsupported file formats", () => {
    const output = "catalogs.bin";

    expect(() => exportCatalogs(output, preset)).toThrow(
      "Unsupported file format: .bin"
    );
  });

  it("supports pnpm catalogs", () => {
    const output = "catalogs.yaml";

    fs.__setMockFileWriter((dst: string, content: string) => {
      expect(dst).toBe(output);
      expect(content).toBe(`catalogs:
  "0.82":
    react: 19.1.1
    react-native: ^0.82.0
  "1.0":
    react: 19.2.0
    react-native: ^1.0.0
`);
    });

    exportCatalogs(output, preset);
  });

  it("preserves existing content in the output file", () => {
    const output = "catalogs.yaml";

    fs.__setMockContent(`
enableScripts: false
globalFolder: .yarn/berry
nodeLinker: pnpm
catalogs:
  "0.81":
    react: 19.0.0
    react-native: ^0.81.0
  "0.82":
    react: 19.1.1
    react-native: ^0.82.0-0
`);

    fs.__setMockFileWriter((dst: string, content: string) => {
      expect(dst).toBe(output);
      expect(content).toBe(`enableScripts: false
globalFolder: .yarn/berry
nodeLinker: pnpm
catalogs:
  "0.81":
    react: 19.0.0
    react-native: ^0.81.0
  "0.82":
    react: 19.1.1
    react-native: ^0.82.0
  "1.0":
    react: 19.2.0
    react-native: ^1.0.0
`);
    });

    exportCatalogs(output, preset);
  });

  it("supports Bun catalogs (under 'workspaces')", () => {
    const output = "package.json";

    fs.__setMockContent({
      name: "my-monorepo",
      workspaces: {
        packages: ["packages/*"],
        catalog: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
        catalogs: {
          testing: {
            jest: "30.0.0",
            "testing-library": "14.0.0",
          },
        },
      },
    });

    fs.__setMockFileWriter((dst: string, content: string) => {
      expect(dst).toBe(output);
      expect(content).toBe(`{
  "name": "my-monorepo",
  "workspaces": {
    "packages": [
      "packages/*"
    ],
    "catalog": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "catalogs": {
      "testing": {
        "jest": "30.0.0",
        "testing-library": "14.0.0"
      },
      "0.82": {
        "react": "19.1.1",
        "react-native": "^0.82.0"
      },
      "1.0": {
        "react": "19.2.0",
        "react-native": "^1.0.0"
      }
    }
  }
}
`);
    });

    exportCatalogs(output, preset);
  });

  it("supports Bun catalogs (at the root level)", () => {
    const output = "package.json";

    fs.__setMockContent({
      name: "my-monorepo",
      workspaces: {
        packages: ["packages/*"],
      },
      catalog: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
    });

    fs.__setMockFileWriter((dst: string, content: string) => {
      expect(dst).toBe(output);
      expect(content).toBe(`{
  "name": "my-monorepo",
  "workspaces": {
    "packages": [
      "packages/*"
    ]
  },
  "catalog": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "catalogs": {
    "0.82": {
      "react": "19.1.1",
      "react-native": "^0.82.0"
    },
    "1.0": {
      "react": "19.2.0",
      "react-native": "^1.0.0"
    }
  }
}
`);
    });

    exportCatalogs(output, preset);
  });

  it("prefers catalogs under 'workspaces'", () => {
    const output = "package.json";

    fs.__setMockContent({ name: "my-monorepo" });

    fs.__setMockFileWriter((dst: string, content: string) => {
      expect(dst).toBe(output);
      expect(content).toBe(`{
  "name": "my-monorepo",
  "workspaces": {
    "catalogs": {
      "0.82": {
        "react": "19.1.1",
        "react-native": "^0.82.0"
      },
      "1.0": {
        "react": "19.2.0",
        "react-native": "^1.0.0"
      }
    }
  }
}
`);
    });

    exportCatalogs(output, preset);
  });
});
