import { parsePlatformValue } from "@rnx-kit/tools-react-native";
import { runBuildCmdline } from "../command";
import { Tracer } from "../tracer";
import type { ToolCmdLineOptions } from "../types";

type CmdLineOption = {
  param?: "string" | "array" | "boolean";
  desc: string;
  validate?: (val: string | string[]) => void;
};

const commandOptions: { [key in keyof ToolCmdLineOptions]: CmdLineOption } = {
  platforms: {
    param: "array",
    desc: "Build one or more platforms for react-native. Example: --platforms=android,ios",
    validate: validatePlatforms,
  },
  detectPlatforms: {
    desc: "Detect the platforms to build based on configurations and dependencies.",
  },
  noTypecheck: {
    desc: "Only emit files and do not type-check them. This will also disable multiplexing the build for multiple platforms.",
  },
  asyncWrites: {
    desc: "Write out files asynchronously.",
  },
  verbose: {
    desc: "Provide verbose logging output.",
  },
  trace: {
    desc: "Provide detailed trace output.",
  },
  help: {
    desc: "Provide usage information.",
  },
};

/**
 * Ensure the platform array can be coerced into AllPlatforms[], otherwise error
 */
function validatePlatforms(value: string | string[]) {
  value = Array.isArray(value) ? value : [value];
  value.forEach((platform) => {
    if (!parsePlatformValue(platform)) {
      console.error(`Invalid platform: ${platform}`);
      process.exit(1);
    }
  });
}

/**
 * Console log a description of usage and commands
 */
function outputHelp() {
  console.log("Usage: ts-tool [tool-options] [typescript options]");
  console.log(
    "-- this tool will extract the options listed below and pass any remaining options to typescript."
  );
  console.log(
    "-- order does not matter with regards to where tool specific options appear."
  );
  console.log("Options:");
  for (const key in commandOptions) {
    console.log(
      `  --${key}:`.padEnd(21) +
        commandOptions[key as keyof ToolCmdLineOptions]!.desc
    );
  }
}

/**
 * @param args command line arguments, will be modified if tool specific options are found
 * @returns any extracted tool specific options
 */
export function extractOptions(args: string[]): ToolCmdLineOptions {
  const results: {
    [key in keyof ToolCmdLineOptions]?: string | string[] | boolean;
  } = {};
  let index = 0;
  while (index < args.length) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      const parts = arg.split("=");
      const name = parts[0].substring(2) as keyof ToolCmdLineOptions;
      const paramVal = parts.length > 0 ? parts[1] : undefined;
      const option = commandOptions[name];

      if (option) {
        // this is a known option, parse it and remove it from the args list
        const { param = "boolean", validate } = option;
        if (param === "boolean") {
          results[name] = paramVal ? paramVal.toLowerCase() === "true" : true;
        } else if (paramVal) {
          results[name] = param === "array" ? paramVal.split(",") : paramVal;
          if (validate) {
            validate(results[name]);
          }
        } else {
          console.error(`Missing parameter for option: ${arg}`);
          process.exit(1);
        }
        args.splice(index, 1);
        continue;
      }
    }
    index++;
  }
  return results as ToolCmdLineOptions;
}

export async function runWithCmdlineArgs(args: string[]) {
  const options = extractOptions(args);
  if (options.help) {
    outputHelp();
    return;
  }
  options.rootDir = process.cwd();
  const tracer = new Tracer(!!options.verbose, !!options.trace);
  return await tracer
    .timeAsync("build in", async () => {
      return await runBuildCmdline(options, args, tracer);
    })
    .then(() => {
      tracer.reportTimers();
    });
}

/**
 * Handle the cli options for the build command and run the build.
 */
export async function main() {
  const args = process.argv.slice(2);
  return await runWithCmdlineArgs(args);
}
