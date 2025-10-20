import type { Ora } from "ora";
import { extract } from "../archive.ts";
import * as platforms from "../platforms.ts";
import type { BuildParams, Context, Platform } from "../types.ts";

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
