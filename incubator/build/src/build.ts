import ora from "ora";
import { extract } from "./archive";
import { deleteBranch, pushCurrentChanges } from "./git";
import { installAndLaunchApk } from "./platforms/android";
import { installAndLaunchApp } from "./platforms/ios";
import type { BuildParams, Remote, RepositoryInfo } from "./types";

export async function startBuild(
  remote: Remote,
  repoInfo: RepositoryInfo,
  inputs: BuildParams
): Promise<number> {
  const spinner = ora();

  if (!remote.isSetUp(spinner)) {
    return 1;
  }

  spinner.start("Creating build branch");
  const upstream = "origin";
  const buildBranch = await pushCurrentChanges(upstream);
  if (!buildBranch) {
    return 1;
  }

  spinner.succeed(`Created build branch ${buildBranch}`);

  const cleanUp = async () => {
    spinner.start(`Deleting ${buildBranch}`);
    await deleteBranch(buildBranch, upstream);
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
    const context = { ...repoInfo, ref: buildBranch };
    const artifactFile = await remote.build(context, inputs, spinner);

    spinner.start("Extracting build artifact");
    const buildArtifact = await extract(artifactFile);
    spinner.succeed(`Extracted ${buildArtifact}`);

    switch (inputs.platform) {
      case "android":
        await installAndLaunchApk(buildArtifact, undefined, spinner);
        break;
      case "ios":
        await installAndLaunchApp(buildArtifact, undefined, spinner);
        break;
      default:
        break;
    }
  } catch (e) {
    spinner.fail();
    await cleanUp();
    throw e;
  }

  await cleanUp();
  return 0;
}
