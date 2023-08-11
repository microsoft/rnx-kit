import type { Ora } from "ora";
import { extract } from "../archive.js";
import * as platforms from "../platforms.js";
import type { BuildParams, Context, Platform } from "../types.js";

export async function deploy(
  context: Context & BuildParams,
  artifact: string,
  spinner: Ora
): Promise<void> {
  spinner.start("Extracting build artifact");
  const buildArtifact = await extract(artifact);
  spinner.succeed(`Extracted ${buildArtifact}`);

  const platform = await platforms.get(context.platform);
  await platform.deploy(buildArtifact, context, spinner);
}

export function getConfigString(_platform: Platform): Promise<string> {
  return Promise.resolve("local");
}
