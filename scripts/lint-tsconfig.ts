import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type ErrorType = "wrong-base-config" | "missing-rootDir-or-noEmit";

type TypeScriptConfig = Partial<{
  extends: string;
  compilerOptions: Record<string, unknown>;
  include: string[];
}>;

function verifyBase({ extends: base }: TypeScriptConfig): ErrorType | null {
  return typeof base === "string" && !base.startsWith("@rnx-kit/tsconfig")
    ? "wrong-base-config"
    : null;
}

function verifyEmit({
  compilerOptions,
  include,
}: TypeScriptConfig): ErrorType | null {
  return Array.isArray(include) &&
    compilerOptions?.rootDir !== include[0] &&
    !compilerOptions?.noEmit
    ? "missing-rootDir-or-noEmit"
    : null;
}

function toErrorMessage(error: ErrorType): string {
  switch (error) {
    case "wrong-base-config":
      return "config must use `@rnx-kit/tsconfig` as base";
    case "missing-rootDir-or-noEmit":
      return "`compilerOptions.rootDir` should be set to 'src' or `compilerOptions.noEmit` should be set to `true`";
  }
}

function main() {
  const { error, stdout } = spawnSync("yarn", ["workspaces", "list", "--json"]);
  if (error) {
    throw new Error("Failed to list workspaces", { cause: error });
  }

  const workspaces = JSON.parse(
    `[${stdout.toString().trim().split("\n").join(",")}]`
  );

  const rules = [verifyBase, verifyEmit];

  const misconfigured: Record<string, ErrorType[]> = {};
  for (const { location } of workspaces) {
    const tsconfigPath = path.join(location, "tsconfig.json");
    if (fs.existsSync(tsconfigPath)) {
      const data = fs.readFileSync(tsconfigPath, { encoding: "utf-8" });
      const config = JSON.parse(data);

      for (const rule of rules) {
        const error = rule(config);
        if (error) {
          misconfigured[location] ??= [];
          misconfigured[location].push(error);
        }
      }
    }
  }

  const packages = Object.entries(misconfigured);
  for (const [location, errors] of packages) {
    const lines = errors.map((error) => `  - ${toErrorMessage(error)}`);
    console.error(`${location}/tsconfig.json:\n${lines.join("\n")}`);
  }

  return packages.length;
}

process.exitCode = main();
