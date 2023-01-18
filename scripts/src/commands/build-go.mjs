// @ts-check

/** @type {import("../process.mjs").Command} */
export default async function buildGo(_args, _rawArgs) {
  const { goBuildTask, goInstallTask } = await import("@rnx-kit/golang");
  await goInstallTask(console)();
  await goBuildTask(console)();
}
