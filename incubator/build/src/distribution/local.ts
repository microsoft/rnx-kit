import type { Ora } from "ora";
import { extract } from "../archive";
import * as platforms from "../platforms";
import type { BuildParams, Platform } from "../types";

export async function deploy(
  artifact: string,
  params: BuildParams,
  spinner: Ora
): Promise<void> {
  spinner.start("Extracting build artifact");
  const buildArtifact = await extract(artifact);
  spinner.succeed(`Extracted ${buildArtifact}`);

  const platform = await platforms.get(params.platform);
  await platform.deploy(buildArtifact, params, spinner);
}

export function getConfigString(
  _platform: Platform,
  _config: unknown
): Promise<string> {
  return Promise.resolve("local");
}
