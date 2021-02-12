import {
  argv,
  logger,
  resolve,
  resolveCwd,
  JestTaskOptions,
  TaskFunction,
} from "just-scripts";
import { spawn, encodeArgs } from "just-scripts-utils";
import { existsSync, readFileSync } from "fs";
import * as supportsColor from "supports-color";

export function jestTask(options: JestTaskOptions = {}): TaskFunction {
  const jestConfigFile = resolveCwd("./jest.config.js");
  const packageConfigFile = resolveCwd("./package.json");

  return function jest() {
    const jestCmd = resolve("jest/bin/jest.js");
    const configFile = options.config || jestConfigFile;
    const configFileExists = configFile && existsSync(configFile);

    let packageConfigExists = false;
    if (configFileExists) {
      logger.verbose(`Using jest config file ${configFile}`);
    } else if (existsSync(packageConfigFile)) {
      const packageConfig = JSON.parse(
        readFileSync(packageConfigFile, "utf-8")
      );
      if (packageConfig && packageConfig.jest) {
        packageConfigExists = true;
        logger.verbose(`Using jest config from package.json`);
      }
    }

    if ((configFileExists || packageConfigExists) && jestCmd) {
      logger.info(`Running Jest`);
      const cmd = process.execPath;

      const positional = argv()._.slice(1);

      const args = [
        ...(options.nodeArgs || []),
        jestCmd,
        ...(configFileExists ? ["--config", configFile] : []),
        ...(options.passWithNoTests ? ["--passWithNoTests"] : []),
        ...(options.clearCache ? ["--clearCache"] : []),
        ...(options.colors !== false && supportsColor.stdout
          ? ["--colors"]
          : []),
        ...(options.runInBand ? ["--runInBand"] : []),
        ...(options.coverage ? ["--coverage"] : []),
        ...(options.watch ? ["--watch"] : []),
        ...(options.testPathPattern
          ? ["--testPathPattern", options.testPathPattern]
          : []),
        ...(options.testNamePattern
          ? ["--testNamePattern", options.testNamePattern]
          : []),
        ...(options.u || options.updateSnapshot ? ["--updateSnapshot"] : [""]),
        ...(options._ || []).concat(positional),
      ].filter((arg) => !!arg) as Array<string>;

      logger.info(cmd, encodeArgs(args).join(" "));

      return spawn(cmd, args, { stdio: "inherit", env: options.env });
    } else {
      logger.warn("no jest configuration found, skipping jest");
      return Promise.resolve();
    }
  };
}

function createJestTask(options, platform) {
  const config = platform ? `jest.config.${platform}.js` : "jest.config.js";
  return jestTask({ ...options, config: config });
}

function getJestOptions() {
  const updateSnapshot =
    argv().u || argv().updateSnapshot ? { updateSnapshot: true } : undefined;
  return { coverage: !!argv().production, runInBand: true, ...updateSnapshot };
}

export const jest = {
  default: () => {
    const options = getJestOptions();
    return createJestTask(options, undefined);
  },
  ios: () => {
    const options = getJestOptions();
    return createJestTask(options, "ios");
  },
  android: () => {
    const options = getJestOptions();
    return createJestTask(options, "android");
  },
  macos: () => {
    const options = getJestOptions();
    return createJestTask(options, "macos");
  },
  win32: () => {
    const options = getJestOptions();
    return createJestTask(options, "win32");
  },
  windows: () => {
    const options = getJestOptions();
    return createJestTask(options, "windows");
  },
};
