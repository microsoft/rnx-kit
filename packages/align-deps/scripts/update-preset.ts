#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { Octokit } from "@octokit/core";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { info } from "@rnx-kit/console";
import * as fs from "node:fs";
import * as recast from "recast";
import typescript from "recast/parsers/typescript.js";
import type { MetaPackage, Package, Preset } from "../src/types";
import { IGNORED_CAPABILITIES } from "./update-profile.ts";

const MAGIC_KEYWORD = "@microsoft-react-native-sdk";

function isArray<T>(a: T[] | null | undefined): a is T[] {
  return Array.isArray(a) && a.length > 0;
}

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
  info: MetaPackage | Package
): recast.types.namedTypes.ObjectProperty {
  return b.objectProperty(
    b.stringLiteral(capability),
    b.objectExpression(
      Object.entries(info).map(([key, value]) =>
        b.objectProperty(b.identifier(key), valueLiteral(b, value))
      )
    )
  );
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

async function fetchPullRequestFeedback(branch = "rnx-align-deps/main") {
  const octokit = new (Octokit.plugin(restEndpointMethods))({});

  const baseParams = {
    owner: "microsoft",
    repo: "rnx-kit",
    head: `microsoft:${branch}`,
  } as const;

  const pullRequests = await octokit.rest.pulls.list({
    ...baseParams,
    state: "open",
    base: "main",
    per_page: 1,
    page: 1,
  });

  if (!isArray(pullRequests.data)) {
    info(`No pull requests found for '${baseParams.head}'`);
    return;
  }

  const pr = pullRequests.data[0];
  const reviewers = pr.requested_reviewers?.map((user) => user.id);
  if (!isArray(reviewers)) {
    info(`No reviewers found for pull request #${pr.number}`);
    return;
  }

  const comments = await octokit.rest.issues.listComments({
    ...baseParams,
    issue_number: pr.number,
  });

  for (const comment of comments.data) {
    if (
      !reviewers.includes(comment.user?.id || -1) ||
      !comment.body?.startsWith(MAGIC_KEYWORD)
    ) {
      continue;
    }

    const m = comment.body.match(/```json([^]*?)```/);
    if (!m) {
      continue;
    }

    try {
      return JSON.parse(m[1]) as Preset;
    } catch (e) {
      info(`Failed to parse JSON from comment: ${e.message}`);
      continue;
    }
  }

  info(`No feedback found for pull request #${pr.number}`);
}

async function main() {
  const input = await fetchPullRequestFeedback();
  if (!input) {
    return;
  }

  for (const [version, modules] of Object.entries(input)) {
    const profilePath = `./src/presets/microsoft/react-native/profile-${version}.ts`;
    if (!fs.existsSync(profilePath)) {
      throw new Error(`Profile file not found: ${profilePath}`);
    }

    const content = fs.readFileSync(profilePath, "utf-8");
    const ast = recast.parse(content, {
      parser: typescript,
      lineTerminator: "\n",
      sourceFileName: profilePath,
      trailingComma: true,
      tokens: false,
    });

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
        properties[i] = objectProperty(b, id, modules[id]);
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

    fs.writeFileSync(profilePath, recast.print(ast).code, "utf-8");
    info(`Updated profile: ${profilePath}`);
  }
}

main();
