import type { Command } from "@react-native-community/cli-types";
import { rnxAlignDepsCommand } from "./align-deps";
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
    rnxAlignDepsCommand,
    rnxTestCommand,
    rnxWriteThirdPartyNoticesCommand,
    rnxCleanCommand,
  ] as Command<false>[],
};

export { rnxAlignDeps, rnxAlignDepsCommand } from "./align-deps";
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
