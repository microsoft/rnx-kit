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
import { resolveCommunityCLI } from "@rnx-kit/tools-react-native/context";
import { reactNativeConfig } from "../index";
import { RNX_FAST_PATH, RNX_PREFIX } from "./constants";

type Command = BaseCommand<false> | BaseCommand<true>;
type Commands = Record<string, Command>;
type Config = BaseConfig & { [RNX_FAST_PATH]?: true; commands: Command[] };

function canUseFastPath(userCommand: string): boolean {
  const cmd = RNX_PREFIX + userCommand;
  for (const command of reactNativeConfig.commands) {
    if (command.name === cmd) {
      return !(RNX_FAST_PATH in command) || command[RNX_FAST_PATH] !== false;
    }
  }

  return false;
}

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

async function loadContextWithCLI(root: string) {
  const rncli = resolveCommunityCLI(root);
  const { loadConfig, loadConfigAsync } = require(rncli);

  if (!loadConfigAsync) {
    const options = loadConfig.length === 1 ? { projectRoot: root } : root;
    return loadConfig(options);
  }

  return await loadConfigAsync({ projectRoot: root });
}

export async function loadContextForCommand(
  userCommand: string,
  root = process.cwd()
): Promise<Config> {
  // The fast path avoids traversing project dependencies because we know what
  // information our commands depend on.
  if (canUseFastPath(userCommand)) {
    let reactNativePath: string;
    let reactNativeVersion: string;
    return {
      [RNX_FAST_PATH]: true,
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
      get commands(): Config["commands"] {
        const start = RNX_PREFIX.length;
        return reactNativeConfig.commands.map((command) => ({
          ...command,
          name: command.name.substring(start),
        }));
      },
      get healthChecks(): Config["healthChecks"] {
        throw new Error("Unexpected access to `healthChecks`");
      },
      get platforms(): Config["platforms"] {
        throw new Error("Unexpected access to `platforms`");
      },
      get project(): Config["project"] {
        throw new Error("Unexpected access to `project`");
      },
    };
  }

  const config = await loadContextWithCLI(root);

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
