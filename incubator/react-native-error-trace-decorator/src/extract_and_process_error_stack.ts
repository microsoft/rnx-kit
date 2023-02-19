import { info } from "@rnx-kit/console";
import * as fse from "fs-extra";
import * as ChildProcess from "child_process";

interface IBundleInterface {
  bundleIdentifier: string;
  sourcemap: string;
}

interface IConfigFile {
  configs: IBundleInterface[];
}

/**
 *  Extracts and symbolicates error stack traces.
 *
 * @param errorFilePath   The path to the error file
 * @param configFilePath  The path to the config file
 */
export const extractAndSymbolicateErrorStack = (
  errorFilePath: string,
  configFilePath: string
) => {
  // Read config file as an object
  const configFile = JSON.parse(
    fse.readFileSync(configFilePath, "utf-8")
  ) as IConfigFile;

  // Check validity of the passed config file and proceed
  if (checkIfConfigFileIsValidAndPopulateMap(configFile)) {
    // Read error file and split by newline
    const errorFile = fse.readFileSync(errorFilePath, "utf8").split("\n");

    errorFile.forEach((errorLine: string) => {
      configFile.configs.every((config: IBundleInterface, index: number) => {
        if (errorLine.includes(config.bundleIdentifier)) {
          // Write errorLine to a temp file
          fse.writeFileSync("./temp.txt", errorLine);

          // Symbolicate error line
          ChildProcess.execSync(
            `npx metro-symbolicate ${config.sourcemap} < ./temp.txt`,
            { stdio: "inherit" }
          );

          // Print a new line after each line
          console.log("\n");

          // Delete temp file
          fse.removeSync("./temp.txt");

          // Break loop
          return false;
        }

        // If no bundleIdentifier matches errorLine, print the error line as is
        if (index === configFile.configs.length - 1) {
          console.log(errorLine);
        }
        return true;
      });
    });
  }
};

const checkIfConfigFileIsValidAndPopulateMap = (
  configFile: IConfigFile
): boolean => {
  if (configFile.configs) {
    // Parse through all configs and check if sourcemap files exist
    for (
      let bundleIndex = 0;
      bundleIndex < configFile.configs.length;
      bundleIndex++
    ) {
      const currentConfig = configFile.configs[bundleIndex];
      if (
        !currentConfig ||
        !currentConfig.sourcemap ||
        !fse.existsSync(currentConfig.sourcemap) ||
        !currentConfig.bundleIdentifier
      ) {
        info(
          `Config: { bundleIdentifier: ${currentConfig.bundleIdentifier}, sourcemap: ${currentConfig.sourcemap} } is not proper`
        );
        return false;
      }
    }
    return true;
  }
  return false;
};
