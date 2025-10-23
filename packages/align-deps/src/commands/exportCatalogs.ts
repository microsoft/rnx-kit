import yaml from "js-yaml";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { isMetaPackage } from "../capabilities.ts";
import { mergePresets } from "../preset.ts";
import { preset as defaultPreset } from "../presets/microsoft/react-native.ts";
import type { Command, ErrorCode, MetaPackage, Package } from "../types.ts";

type Args = {
  exportCatalogs: string;
  presets: string[];
};

type PackageDefinition = MetaPackage | Package;

type Config = {
  data: {
    catalogs?: Record<string, Record<string, string>>;
    [key: string]: unknown;
  };
  serialize: () => string;
};

function compare(lhs: PackageDefinition, rhs: PackageDefinition): -1 | 0 | 1 {
  if (lhs.name === rhs.name) {
    return 0;
  }
  return lhs.name < rhs.name ? -1 : 1;
}

function parseFile(filename: string, fs: typeof nodefs): Config {
  const content =
    fs.existsSync(filename) && fs.readFileSync(filename, { encoding: "utf-8" });

  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    // Bun v1.2.14+
    case ".json": {
      const data = content ? JSON.parse(content) : {};
      const preferWorkspaces = !("catalog" in data || "catalogs" in data);
      if (preferWorkspaces && !data["workspaces"]) {
        data["workspaces"] = {};
      }
      return {
        data: preferWorkspaces ? data["workspaces"] : data,
        serialize: () => JSON.stringify(data, null, 2) + "\n",
      };
    }

    // pnpm v9.5.0+ and Yarn v4.10.0+
    case ".yaml":
    case ".yml": {
      const data = content
        ? (yaml.load(content) as Record<string, unknown>)
        : {};
      return { data, serialize: () => yaml.dump(data, { quotingType: '"' }) };
    }
  }

  throw new Error(`Unsupported file format: ${extension}`);
}

export function exportCatalogs(
  dest: string,
  preset = defaultPreset,
  fs = nodefs
): void {
  const config = parseFile(dest, fs);

  const catalogs = config.data["catalogs"] ?? {};
  config.data["catalogs"] = catalogs;

  for (const [name, profile] of Object.entries(preset)) {
    const catalog: Record<string, string> = {};
    catalogs[name] = catalog;

    for (const capability of Object.values(profile).sort(compare)) {
      if (!isMetaPackage(capability)) {
        catalog[capability.name] = capability.version;
      }
    }
  }

  fs.writeFileSync(dest, config.serialize(), { encoding: "utf-8" });
}

export function makeExportCatalogsCommand({
  exportCatalogs: destination,
  presets,
}: Args): Command | undefined {
  const command = (): ErrorCode => {
    const preset = mergePresets(presets, process.cwd());
    exportCatalogs(destination, preset);
    return "success" as const;
  };
  command.isRootCommand = true;
  return command;
}
