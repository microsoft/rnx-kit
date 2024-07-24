import type { Command, Config } from "@react-native-community/cli-types";
import { resolveCommunityCLI } from "@rnx-kit/tools-react-native/context";

function tryImport(module: string, fromDir: string) {
  try {
    const p = require.resolve(module, { paths: [fromDir] });
    return require(p);
  } catch (_) {
    return undefined;
  }
}

export function findExternalCommands(config: Config): Command[] {
  if ("__rnxFastPath" in config) {
    // Fast path means we don't need to do anything here
    return [];
  }

  const externalCommands: Command[] = [
    {
      name: "config",
      description:
        "Prints the configuration for the project and its dependencies in JSON format; used by autolinking",
      func: () => console.log(JSON.stringify(config, undefined, 2)),
    },
  ];

  const rncli = resolveCommunityCLI(config.root);

  const cliDoctor = tryImport("@react-native-community/cli-doctor", rncli);
  if (cliDoctor?.commands) {
    const commands = Object.values(cliDoctor.commands) as Command[];
    externalCommands.push(...commands);
  }

  return externalCommands;
}
