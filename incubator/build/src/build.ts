import ora from "ora";
import { once } from "./async";
import { deleteBranch, pushCurrentChanges } from "./git";
import type {
  BuildParams,
  DistributionPlugin,
  Remote,
  RepositoryInfo,
} from "./types";

export async function startBuild(
  remote: Remote,
  distribution: DistributionPlugin,
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
  const cleanUp = once(async () => {
    spinner.start("Cleaning up");
    await Promise.allSettled([
      remote.cancelBuild(context),
      deleteBranch(buildBranch, upstream),
    ]);
    spinner.succeed(`Deleted ${buildBranch}`);
  });
  const onSignal = () => {
    spinner.fail();
    cleanUp().then(() => process.exit(1));
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  spinner.start("Queueing build");

  try {
    const artifact = await remote.build(context, inputs, spinner);
    if (!artifact) {
      await cleanUp();
      return 1;
    }

    await distribution.deploy({ ...context, ...inputs }, artifact, spinner);
  } catch (e) {
    spinner.fail();
    await cleanUp();
    throw e;
  }

  await cleanUp();
  return 0;
}
