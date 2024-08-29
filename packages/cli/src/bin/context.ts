import type {
  Command as BaseCommand,
  Config as BaseConfig,
} from "@react-native-community/cli-types";
import {
  findPackageDependencyDir,
  readPackage,
} from "@rnx-kit/tools-node/package";
import {
  getCurrentState,
  getSavedState,
  saveConfigToCache,
} from "@rnx-kit/tools-react-native/cache";
import {
  loadContext,
  resolveCommunityCLI,
} from "@rnx-kit/tools-react-native/context";
import { reactNativeConfig } from "../index";

type Command = BaseCommand<false> | BaseCommand<true>;
type Commands = Record<string, Command>;
type Config = BaseConfig & { __rnxFastPath?: true; commands: Command[] };

const RNX_PREFIX = "rnx-";

function findReactNativePath(root: string, resolveSymlinks = false) {
  const dir = findPackageDependencyDir("react-native", {
    startDir: root,
    resolveSymlinks,
  });
  if (!dir) {
    throw new Error("Unable to resolve module 'react-native'");
  }
  return dir;
}

export function getCoreCommands() {
  const start = RNX_PREFIX.length;
  return reactNativeConfig.commands.map((command) => ({
    ...command,
    name: command.name.substring(start),
  }));
}

export function uniquify(commands: Command[]): Command[] {
  const uniqueCommands: Commands = {};
  for (const command of commands) {
    const { name } = command;
    if (name.startsWith(RNX_PREFIX)) {
      command.name = name.substring(RNX_PREFIX.length);
      uniqueCommands[command.name] = command;
    } else if (!uniqueCommands[name]) {
      uniqueCommands[name] = command;
    }
  }
  return Object.values(uniqueCommands);
}

export function loadContextForCommand(
  userCommand: string,
  root = process.cwd()
): Config {
  // The fast path avoids traversing project dependencies because we know what
  // information our commands depend on.
  const coreCommands = getCoreCommands();
  const useFastPath = coreCommands.some(({ name }) => name === userCommand);
  if (useFastPath) {
    let reactNativePath: string;
    let reactNativeVersion: string;
    return {
      __rnxFastPath: true,
      root,
      get reactNativePath() {
        if (!reactNativePath) {
          reactNativePath = findReactNativePath(root);
        }
        return reactNativePath;
      },
      get reactNativeVersion() {
        if (!reactNativeVersion) {
          const reactNativePath = findReactNativePath(root);
          const { version } = readPackage(reactNativePath);
          reactNativeVersion = version;
        }
        return reactNativeVersion;
      },
      get dependencies(): Config["dependencies"] {
        throw new Error("Unexpected access to `dependencies`");
      },
      assets: [],
      commands: coreCommands,
      get healthChecks(): Config["healthChecks"] {
        throw new Error("Unexpected access to `healthChecks`");
      },
      get platforms(): Config["platforms"] {
        throw new Error("Unexpected access to `platforms`");
      },
      get project(): Config["project"] {
        // Used by the build command
        return loadContext(root).project;
      },
    };
  }

  const rncli = resolveCommunityCLI(root);
  const { loadConfig } = require(rncli);
  const config =
    loadConfig.length === 1
      ? loadConfig({ projectRoot: root })
      : loadConfig(root);

  // We will always load from disk because functions cannot be serialized.
  // However, we should refresh the cache if needed.
  const state = getCurrentState(root);
  if (state !== getSavedState(root)) {
    saveConfigToCache(root, state, config);
  }

  // Before returning the config, remove the `rnx-` prefix from our commands,
  // and ensure commands are unique.
  config.commands = uniquify(config.commands);

  return config;
}
