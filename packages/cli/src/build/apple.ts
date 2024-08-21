import type { BuildParams } from "@rnx-kit/tools-apple" with { "resolution-mode": "import" };
import type { Ora } from "ora";

export type BuildArgs = {
  xcworkspace: string;
  args: string[];
};

export type BuildResult = BuildArgs | number | null;

export type BuildSettings = {
  action: string;
  buildSettings: {
    EXECUTABLE_FOLDER_PATH: string;
    FULL_PRODUCT_NAME: string;
    PRODUCT_BUNDLE_IDENTIFIER: string;
    TARGET_BUILD_DIR: string;
    WRAPPER_EXTENSION?: string;
  };
  target: string;
};

export type InputParams = BuildParams & { workspace?: string };

export async function getBuildSettings(
  result: BuildArgs
): Promise<BuildSettings | undefined> {
  const reusedFlags = ["-scheme", "-configuration", "-sdk", "-derivedDataPath"];

  const buildArgs = result.args;
  const buildSettingsArgs = ["-workspace", result.xcworkspace];
  for (const flag of reusedFlags) {
    const i = buildArgs.lastIndexOf(flag);
    if (i >= 0) {
      buildSettingsArgs.push(buildArgs[i], buildArgs[i + 1]);
    }
  }

  buildSettingsArgs.push("-showBuildSettings", "-json");

  const { makeCommand } = await import("@rnx-kit/tools-shell");

  const xcodebuild = makeCommand("xcodebuild");
  const { status, stdout } = await xcodebuild(...buildSettingsArgs);
  if (status !== 0) {
    return undefined;
  }

  const buildSettings: BuildSettings[] = JSON.parse(stdout);
  return buildSettings.find(
    ({ buildSettings }) => buildSettings.WRAPPER_EXTENSION === "app"
  );
}

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
