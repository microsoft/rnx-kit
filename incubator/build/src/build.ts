import ora from "ora";
import { extract } from "./archive";
import { deleteBranch, pushCurrentChanges } from "./git";
import * as platforms from "./platforms";
import type { BuildParams, Remote, RepositoryInfo } from "./types";

export async function startBuild(
  remote: Remote,
  repoInfo: RepositoryInfo,
  inputs: BuildParams
): Promise<number> {
  const spinner = ora();

  spinner.start("Creating build branch");

  const upstream = "origin";
  const buildBranch = await pushCurrentChanges(upstream);
  if (!buildBranch) {
    return 1;
  }

  spinner.succeed(`Created build branch ${buildBranch}`);

  const context = { ...repoInfo, ref: buildBranch };
  const cleanUp = async () => {
    spinner.start("Cleaning up");
    await Promise.allSettled([
      remote.cancelBuild(context),
      deleteBranch(buildBranch, upstream),
    ]);
    spinner.succeed(`Deleted ${buildBranch}`);
  };
  const onSignal = () => {
    spinner.fail();
    cleanUp().then(() => process.exit(1));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  spinner.start("Queueing build");

  try {
    const artifactFile = await remote.build(context, inputs, spinner);
    if (!artifactFile) {
      await cleanUp();
      return 1;
    }

    spinner.start("Extracting build artifact");
    const buildArtifact = await extract(artifactFile);
    spinner.succeed(`Extracted ${buildArtifact}`);

    const platform = await platforms.get(inputs.platform);
    await platform.deploy(buildArtifact, inputs, spinner);
  } catch (e) {
    spinner.fail();
    await cleanUp();
    throw e;
  }

  await cleanUp();
  return 0;
}
