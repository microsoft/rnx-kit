import ts from "typescript";
import { extractParameterFlag, extractParameterValue } from "./extract";

function reportParameterDependencyViolation(
  dependent: string,
  dependee: string
): never {
  throw new Error(
    `--${dependent} can only be used in conjunction with --${dependee}`
  );
}

function reportUnsupportTscCliArgument(argName: string): never {
  throw new Error(`tsc command-line parameter '--${argName}' is not supported`);
}

export type ParsedCommandLineRnTs = {
  platform?: string;
  platformExtensions?: string[];
  disableReactNativePackageSubstitution?: boolean;
};

export type CommandLine = {
  rnts: ParsedCommandLineRnTs;
  ts: ts.ParsedCommandLine;
};

export function parseCommandLineRnTs(args: string[]): {
  cmdLineRnTs: ParsedCommandLineRnTs;
  tsArgs: string[];
} {
  const argsCopy = [...args];

  const platform = extractParameterValue(argsCopy, "platform");

  const platformExtensions = extractParameterValue(
    argsCopy,
    "platformExtensions"
  )?.split(",");
  if (!platform && platformExtensions) {
    reportParameterDependencyViolation("platformExtensions", "platform");
  }

  const disableReactNativePackageSubstitution = extractParameterFlag(
    argsCopy,
    "disableReactNativePackageSubstitution"
  );
  if (!platform && disableReactNativePackageSubstitution) {
    reportParameterDependencyViolation(
      "disableReactNativePackageSubstitution",
      "platform"
    );
  }

  return {
    cmdLineRnTs: {
      platform,
      platformExtensions,
      disableReactNativePackageSubstitution,
    },
    tsArgs: argsCopy,
  };
}

export function parseCommandLineTs(args: string[]): ts.ParsedCommandLine {
  if (args.length > 2) {
    if (args[2].toLowerCase() === "--build") {
      reportUnsupportTscCliArgument("--build");
    } else if (args[2].toLowerCase() === "-b") {
      reportUnsupportTscCliArgument("-b");
    }
  }

  const cmdLine = ts.parseCommandLine(args.slice(2));
  if (!cmdLine) {
    throw new Error("failed to parse TypeScript command-line options");
  }

  return cmdLine;
}

export function parseCommandLine(args: string[]): CommandLine {
  const { cmdLineRnTs, tsArgs: tscArgs } = parseCommandLineRnTs(args);
  const cmdLineTs = parseCommandLineTs(tscArgs);

  return {
    rnts: cmdLineRnTs,
    ts: cmdLineTs,
  };
}
