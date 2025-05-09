/**
 *
 * @param {string} modulePath
 * @returns
 */
export async function dynamicImport(modulePath) {
  // eslint-disable-next-line no-new-func
  return await new Function(`return import("${modulePath}")`)();
}

export async function runExperimentalCommand() {
  const { runExperimentalCli } = await dynamicImport("./experimental/cli.js");
  return await runExperimentalCli();
}
