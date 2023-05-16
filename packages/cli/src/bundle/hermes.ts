import type { HermesOptions } from "@rnx-kit/config";
import { error, info } from "@rnx-kit/console";
import { findPackageDependencyDir } from "@rnx-kit/tools-node/package";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function hermesBinaryInDir(hermesc: string): string | null {
  switch (os.platform()) {
    case "darwin":
      return path.join(hermesc, "osx-bin", "hermesc");
    case "linux":
      return path.join(hermesc, "linux64-bin", "hermesc");
    case "win32":
      return path.join(hermesc, "win64-bin", "hermesc.exe");
    default:
      return null;
  }
}

function findHermesBinary() {
  const locations = [
    () => {
      const rnPath = findPackageDependencyDir("react-native");
      if (!rnPath) {
        throw new Error("Cannot find module 'react-native'");
      }
      return path.join(rnPath, "sdks", "hermesc");
    },
    () => findPackageDependencyDir("hermes-engine"),
  ];

  for (const getLocation of locations) {
    const location = getLocation();
    if (location) {
      const hermesc = hermesBinaryInDir(location);
      if (hermesc && fs.existsSync(hermesc)) {
        return hermesc;
      }
    }
  }

  return null;
}

function getOutput(args: string[]): string | null {
  const length = args.length;
  for (let i = 0; i < length; ++i) {
    const flag = args[i];
    if (flag === "-out") {
      return args[i + 1];
    } else if (flag.startsWith("-out=")) {
      return flag.substring(5);
    }
  }
  return null;
}

function isSourceMapFlag(flag: string): boolean {
  return flag === "-source-map" || flag.startsWith("-source-map=");
}

export function emitBytecode(
  input: string,
  sourcemap: string | undefined,
  options: HermesOptions
): void {
  const cmd = options.command || findHermesBinary();
  if (!cmd) {
    error("No Hermes compiler was found");
    return;
  }

  const args = [
    "-emit-binary",
    // If Hermes can't detect the width of the terminal, it will set the limit
    // to "unlimited". Since we might be passing a minified bundle to Hermes,
    // limit output width to avoid issues when it outputs diagnostics. See:
    //   - https://github.com/microsoft/rnx-kit/issues/2416
    //   - https://github.com/microsoft/rnx-kit/issues/2419
    //   - https://github.com/microsoft/rnx-kit/issues/2424
    "-max-diagnostic-width=80",
    ...(options.flags ?? ["-O", "-output-source-map", "-w"]),
  ];

  let output = getOutput(args);
  if (!output) {
    output = input + ".hbc";
    args.push("-out", output);
  }

  if (sourcemap && !args.some(isSourceMapFlag)) {
    args.push("-source-map", sourcemap);
  }

  args.push(input);

  info("Emitting bytecode to:", output);
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw result.error;
  }
}
