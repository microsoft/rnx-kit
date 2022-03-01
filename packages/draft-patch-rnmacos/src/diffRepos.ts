import {
  traverseDirectory,
  writeFile,
  getRelativePath,
  lookUpRelativePath,
  eraseAndRecreateDirectory,
  resolvePath,
  copyFile2,
  getFileNameExtension,
} from "./fs_utils";
import { diffFiles } from "./patch_utils";
import { log } from "./logger";
import { isFileBinary } from "./file_type_utils";
import { compareFiles } from "./file_compare";
import { cleanRepoSync } from "./git_utils";

import { IDiffCommandOptions, DiffReposFuncType } from "./types";

const diffRepos: DiffReposFuncType = (
  dirtyRepoAbsPath: string,
  baseRepoAbsPath: string,
  options: IDiffCommandOptions
) => {
  log.info("diffRepos", `dirtyRepoAbsPath: ${dirtyRepoAbsPath}`);
  log.info("diffRepos", `baseRepoAbsPath: ${baseRepoAbsPath}`);
  log.info("diffRepos", `options.patchName: ${options.patchName}`);
  log.info(
    "diffRepos",
    `options.inclusionListDirs: ${options.inclusionListDirs}`
  );
  log.info(
    "diffRepos",
    `options.exclusionListDirs: ${options.exclusionListDirs}`
  );
  log.info(
    "diffRepos",
    `options.exclusionListExts: ${options.exclusionListExts}`
  );
  log.info("diffRepos", `options.gitExecutable: ${options.gitExecutable}`);
  log.info("diffRepos", `options.cleanupRepos: ${options.cleanupRepos}`);

  log.info("diffRepos", `options.diffExecutable: ${options.diffExecutable}`);
  log.info(
    "diffRepos",
    `options.cleanupExistingPatches: ${options.cleanupExistingPatches}`
  );

  const patchStorePath = resolvePath(dirtyRepoAbsPath, options.patchName);

  // Where we write the patches ..
  // const bothPath = resolvePath(patchStorePath, 'both');
  // const forkOnlyPath = resolvePath(patchStorePath, 'fork-only');

  // Init output directory
  // eraseAndRecreateDirectory(bothPath);
  // eraseAndRecreateDirectory(forkOnlyPath);
  eraseAndRecreateDirectory(patchStorePath);

  if (options.cleanupRepos) {
    cleanRepoSync(options.baseFork, options.gitExecutable);
    cleanRepoSync(options.dirtyFork, options.gitExecutable);
  }

  const callbackFile = (dirtyRepoFileAbsPath: string) => {
    const forkFileRelativePath = getRelativePath(
      dirtyRepoFileAbsPath,
      dirtyRepoAbsPath
    );

    const fileNameExtension = getFileNameExtension(dirtyRepoFileAbsPath);
    if (options.exclusionListExts.includes(fileNameExtension)) {
      log.info(
        "diffFork",
        `Ignoring {dirtyRepoFileAbsPath} based on file name extension.`
      );
      return;
    }
    const callbackOnHit = (sourceRepoFileAbsPath: string) => {
      const callbackOnDiffCreated = (patch: string) => {
        writeFile(patchStorePath, forkFileRelativePath, `${patch}`, "");
      };
      const callbackOnError = (error: string) => {
        log.error("diffFork", error);
      };
      const callbackOnBinaryFilesCompare = (same: boolean) => {
        if (!same) {
          copyFile2(patchStorePath, forkFileRelativePath, dirtyRepoFileAbsPath);
        } else {
          log.info(
            "diffFork",
            `Skip copying identical binary files: ${forkFileRelativePath}`
          );
        }
      };
      const callbackOnBinaryFilesCompareError = (result: string) => {
        log.error("diffFork", `callbackOnBinaryFilesCompareError: ${result}`);
      };

      const handleBinaryFileInFork = () => {
        compareFiles(
          sourceRepoFileAbsPath,
          dirtyRepoFileAbsPath,
          callbackOnBinaryFilesCompare,
          callbackOnBinaryFilesCompareError
        );
      };
      // If it's a binary file we copy it as is to the patches folder.
      if (isFileBinary(dirtyRepoFileAbsPath)) {
        handleBinaryFileInFork();
      } else {
        diffFiles(
          sourceRepoFileAbsPath,
          false /* new file*/,
          dirtyRepoFileAbsPath,
          callbackOnDiffCreated,
          callbackOnError,
          options.diffExecutable
        );
      }
    };

    const callbackOnMiss = (sourceRepoFileAbsPath: string) => {
      const callbackOnDiffCreated = (patch: string) => {
        writeFile(patchStorePath, forkFileRelativePath, `${patch}`, "");
      };
      const callbackOnError = (error: string) => {
        log.error("diffFork", error);
      };
      const handleBinaryFileInFork = () => {
        copyFile2(patchStorePath, forkFileRelativePath, dirtyRepoFileAbsPath);
      };
      if (isFileBinary(dirtyRepoFileAbsPath)) {
        handleBinaryFileInFork();
      } else {
        diffFiles(
          sourceRepoFileAbsPath,
          true /* new file*/,
          dirtyRepoFileAbsPath,
          callbackOnDiffCreated,
          callbackOnError,
          options.diffExecutable
        );
      }
    };

    lookUpRelativePath(
      baseRepoAbsPath,
      forkFileRelativePath,
      callbackOnHit,
      callbackOnMiss
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const callbackDirectory = () => {};

  /*
  Pseudo-code
  1. Traverse through the fork rep
  2. For each file look for the same file in the base repo
  3. If the file is found in the base repo, then create and write the patch file to the patches directory , keeping the same directory hierarchy.
  4. If the file is not found in the base repo, then also create and write the patch file in the patch directory, keeping the same directory hierarchy.
  5. If the file is a binary file, we don't try to diff it, instead just copy the binary file to that patch directory.

  Please note that we currently don't traverse the base repository, assuming that all the files in the base repository are present in the fork also. Essentially, we expect the patches to be only additions.
  */

  if (options.inclusionListDirs.length === 0) {
    traverseDirectory(
      dirtyRepoAbsPath,
      ".",
      callbackFile,
      callbackDirectory,
      options.exclusionListDirs
    );
  } else {
    options.inclusionListDirs.forEach((dir) => {
      if (
        options.exclusionListDirs.includes(
          dir.startsWith(".\\") ? dir.substr(2) : dir
        )
      ) {
        log.info(
          "diffFork",
          `${dir} is present in both inclusionList as well as exclusionList. Ignoring it.`
        );
      } else {
        traverseDirectory(
          dirtyRepoAbsPath,
          dir,
          callbackFile,
          callbackDirectory,
          options.exclusionListDirs
        );
      }
    });
  }
};

export default diffRepos;
