import { log } from "./logger";
import { applyPatchTool, applyPatchEmbedded } from "./patch_utils";
import { IPatchFileCommandOptions, PatchFileFuncType } from "./types";

function applyPatch(
  targetPath: string,
  patchPath: string,
  options: IPatchFileCommandOptions,
  _callback: (result: string) => void,
  _errorCallback: (error: string) => void
) {
  log.info(
    "patchFile",
    `Applying ${patchPath} on ${targetPath} with options ${options}`
  );
  if (options.embeddedPatcher) {
    const success = applyPatchEmbedded({
      patchFilePath: patchPath,
      targetFilePathOverride: targetPath,
      reverse: options.reverse,
    });
    if (!success)
      log.error("patchFile", `Applying ${patchPath} on ${targetPath} failed.`);
  } else {
    applyPatchTool(
      targetPath,
      patchPath,
      (result: string) => {
        log.info("patchFile", result);
      },
      (result: string) => {
        log.error("patchFile", result);
      },
      options.patchExecutable,
      options.reverse
    );
  }
}

const patchFile: PatchFileFuncType = (
  targetFileAbsPath: string,
  patchFileAbsPath: string,
  options: IPatchFileCommandOptions
) => {
  log.info("patchFile", `targetFileAbsPath: ${targetFileAbsPath}`);
  log.info("patchFile", `patchFileAbsPath: ${patchFileAbsPath}`);
  log.info("patchFile", `embeddedPatcher?: ${options.embeddedPatcher}`);
  log.info("patchFile", `options.reverse: ${options.reverse}`);
  log.info("patchFile", `options.patchExecutable: ${options.patchExecutable}`);

  applyPatch(
    targetFileAbsPath,
    patchFileAbsPath,
    options,
    (result: string) => {
      log.info("patchFile", result);
    },
    (result: string) => {
      log.error("patchFile", result);
    }
  );
};

export default patchFile;
