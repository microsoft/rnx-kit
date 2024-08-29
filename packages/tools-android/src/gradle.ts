import { spawn } from "node:child_process";
import * as nodefs from "node:fs";
import * as path from "node:path";
import type { BuildParams } from "./types.js";

/**
 * Invokes Gradle build.
 * @param projectDir
 * @param buildParams
 */
export function assemble(
  projectDir: string,
  { configuration = "Debug", archs }: BuildParams
) {
  const args = [`assemble${configuration}`];

  if (archs) {
    args.push(`-PreactNativeArchitectures=${archs}`);
  }

  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  return spawn(gradlew, args, { cwd: projectDir });
}

/**
 * Tries to find Gradle build output file.
 * @remarks This function may return several files.
 */
export function findOutputFile(
  projectDir: string,
  buildConfiguration: string,
  /** @internal */ fs = nodefs
): string[] {
  const apks: string[] = [];

  const configName = buildConfiguration.toLowerCase();
  for (const moduleName of fs.readdirSync(projectDir)) {
    const outputFile = path.join(
      projectDir,
      moduleName,
      "build",
      "outputs",
      "apk",
      configName,
      `${moduleName}-${configName}.apk`
    );
    if (fs.existsSync(outputFile)) {
      apks.push(outputFile);
    }
  }

  return apks;
}
