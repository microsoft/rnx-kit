import type { Ora } from "ora";

// Copy of types from `@rnx-kit/tools-apple`. If Jest wasn't such a pain to
// configure, we would have added an `import type` at the top instead:
//
//     import type { BuildParams } from "@rnx-kit/tools-apple" with { "resolution-mode": "import" };
//
// But Jest doesn't like import attributes and it doesn't matter if we add
// `@babel/plugin-syntax-import-attributes` in the config.
//
// TOOD: Remove the `DeviceType`, `BuildConfiguration` and `BuildParams` when we
// can migrate away from Jest in this package.
type DeviceType = "device" | "emulator" | "simulator";
type BuildConfiguration = "Debug" | "Release";
type BuildParams =
  | {
      platform: "ios";
      scheme?: string;
      destination?: DeviceType;
      configuration?: BuildConfiguration;
      archs?: string;
      isBuiltRemotely?: boolean;
    }
  | {
      platform: "macos";
      scheme?: string;
      configuration?: BuildConfiguration;
      isBuiltRemotely?: boolean;
    };

export type BuildArgs = {
  xcworkspace: string;
  args: string[];
};

export type BuildResult = BuildArgs | number | null;

export type InputParams = BuildParams & { workspace?: string };

export function runBuild(
  xcworkspace: string,
  buildParams: BuildParams,
  logger: Ora
): Promise<BuildResult> {
  return import("@rnx-kit/tools-apple").then(({ xcodebuild }) => {
    return new Promise<BuildResult>((resolve) => {
      logger.start("Building...");

      const errors: Buffer[] = [];
      const proc = xcodebuild(xcworkspace, buildParams, (text) => {
        const current = logger.text;
        logger.info(text);
        logger.start(current);
      });

      proc.stdout.on("data", () => (logger.text += "."));
      proc.stderr.on("data", (data) => errors.push(data));

      proc.on("close", (code) => {
        if (code === 0) {
          logger.succeed("Build succeeded");
          resolve({ xcworkspace, args: proc.spawnargs });
        } else {
          logger.fail(Buffer.concat(errors).toString());
          process.exitCode = code ?? 1;
          resolve(code);
        }
      });
    });
  });
}
