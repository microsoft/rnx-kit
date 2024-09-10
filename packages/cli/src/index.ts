import type { Command } from "@react-native-community/cli-types";
import { alignDepsCommand } from "@rnx-kit/align-deps";
import { rnxBuildCommand } from "./build";
import { rnxBundleCommand } from "./bundle";
import { rnxCleanCommand } from "./clean";
import { rnxCopyAssetsCommand } from "./copy-assets";
import { rnxRamBundleCommand } from "./ram-bundle";
import { rnxRunCommand } from "./run";
import { rnxStartCommand } from "./start";
import { rnxTestCommand } from "./test";
import { rnxWriteThirdPartyNoticesCommand } from "./write-third-party-notices";

export const reactNativeConfig = {
  commands: [
    rnxBundleCommand,
    rnxRamBundleCommand,
    rnxStartCommand,
    rnxBuildCommand,
    rnxRunCommand,
    rnxCopyAssetsCommand,
    alignDepsCommand,
    rnxTestCommand,
    rnxWriteThirdPartyNoticesCommand,
    rnxCleanCommand,
  ] as Command<false>[],
};

// @rnx-kit/align-deps
export const rnxAlignDeps = alignDepsCommand.func;
export const rnxAlignDepsCommand = alignDepsCommand;

export { rnxBuild, rnxBuildCommand } from "./build";
export { rnxBundle, rnxBundleCommand } from "./bundle";
export { rnxClean, rnxCleanCommand } from "./clean";
export { copyProjectAssets, rnxCopyAssetsCommand } from "./copy-assets";
export { rnxRamBundle, rnxRamBundleCommand } from "./ram-bundle";
export { rnxRun, rnxRunCommand } from "./run";
export { rnxStart, rnxStartCommand } from "./start";
export { rnxTest, rnxTestCommand } from "./test";
export {
  rnxWriteThirdPartyNotices,
  rnxWriteThirdPartyNoticesCommand,
} from "./write-third-party-notices";
