import yaml from "js-yaml";
import * as fs from "node:fs";
import * as path from "node:path";
import { isMetaPackage } from "../capabilities";
import { mergePresets } from "../preset";
import { preset as defaultPreset } from "../presets/microsoft/react-native";
import type { Command, ErrorCode, MetaPackage, Package } from "../types";

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

function parseFile(filename: string): Config {
  const content =
    fs.existsSync(filename) && fs.readFileSync(filename, { encoding: "utf-8" });

  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
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

export function exportCatalogs(dest: string, preset = defaultPreset): void {
  const config = parseFile(dest);

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
