#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { info } from "@rnx-kit/console";
import * as fs from "node:fs";
import * as recast from "recast";
import typescript from "recast/parsers/typescript.js";
import type { MetaPackage, Package } from "../src/types";
import { createGitHubClient, fetchPullRequestFeedback } from "./github.ts";
import { IGNORED_CAPABILITIES } from "./update-profile.ts";

function isExportNamedDeclaration(
  node: recast.types.namedTypes.Node
): node is recast.types.namedTypes.ExportNamedDeclaration {
  return node.type === "ExportNamedDeclaration";
}

function isIdentifier(
  node: recast.types.namedTypes.Node
): node is recast.types.namedTypes.Identifier {
  return node.type === "Identifier";
}

function isObjectProperty(
  node: recast.types.namedTypes.Node
): node is recast.types.namedTypes.ObjectProperty {
  return node.type === "ObjectProperty";
}

function isStringLiteral(
  node: recast.types.namedTypes.Node
): node is recast.types.namedTypes.StringLiteral {
  return node.type === "StringLiteral";
}

function isValidIdentifier(id: string | null): id is string {
  return Boolean(id && !IGNORED_CAPABILITIES.includes(id));
}

function isVariableDeclaration(
  node: recast.types.namedTypes.Node | null
): node is recast.types.namedTypes.VariableDeclaration {
  return node?.type === "VariableDeclaration";
}

function getIdentifier(node: recast.types.namedTypes.Node): string | null {
  if (isObjectProperty(node)) {
    if (isIdentifier(node.key)) {
      return node.key.name;
    }
    if (isStringLiteral(node.key)) {
      return node.key.value;
    }
  }
  return null;
}

function objectProperty(
  b: recast.types.builders,
  capability: string,
  info: MetaPackage | Package,
  comments: recast.types.namedTypes.ObjectProperty["comments"] = null
): recast.types.namedTypes.ObjectProperty {
  return b.objectProperty.from({
    comments,
    key: b.stringLiteral(capability),
    value: b.objectExpression(
      Object.entries(info).map(([key, value]) =>
        b.objectProperty(b.identifier(key), valueLiteral(b, value))
      )
    ),
  });
}

function valueLiteral(b: recast.types.builders, value: unknown) {
  switch (typeof value) {
    case "string":
      return b.stringLiteral(value);
    case "boolean":
      return b.booleanLiteral(value);
    case "number":
      return b.numericLiteral(value);
    default:
      return b.nullLiteral();
  }
}

async function main() {
  const input = await fetchPullRequestFeedback(createGitHubClient());
  if (!input) {
    return;
  }

  for (const [version, modules] of Object.entries(input)) {
    const profilePath = `./src/presets/microsoft/react-native/profile-${version}.ts`;
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile file not found: ${profilePath}`);
    }

    const options = {
      parser: typescript,
      lineTerminator: "\n",
      sourceFileName: profilePath,
      trailingComma: true,
      tokens: false,
    };

    const content = fs.readFileSync(profilePath, "utf-8");
    const ast = recast.parse(content, options);

    const exportedProfile = ast.program.body.find(
      (node) =>
        isExportNamedDeclaration(node) &&
        isVariableDeclaration(node.declaration)
    );
    if (!exportedProfile) {
      throw new Error(`Exported profile not found in: ${profilePath}`);
    }

    const b = recast.types.builders;
    const properties =
      exportedProfile.declaration.declarations[0].init.properties;

    // Update existing capabilities
    const numProperties = properties.length;
    for (let i = 0; i < numProperties; ++i) {
      const id = getIdentifier(properties[i]);
      if (isValidIdentifier(id) && id in modules) {
        const comments = properties[i].comments;
        properties[i] = objectProperty(b, id, modules[id], comments);
        delete modules[id];
      }
    }

    // Add new capabilities
    const capabilities = Object.entries(modules).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    for (const [capability, info] of capabilities) {
      properties.push(objectProperty(b, capability, info));
    }

    fs.writeFileSync(profilePath, recast.print(ast, options).code, "utf-8");
    info(`Updated profile: ${profilePath}`);
  }
}

main();
