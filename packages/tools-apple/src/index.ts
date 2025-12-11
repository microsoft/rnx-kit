export { checkPodsManifestLock } from "./cocoapods.ts";
export {
  bootSimulator,
  getAvailableSimulators,
  getDevices,
  install,
  iosDeploy,
  launch,
  selectDevice,
} from "./ios.ts";
export { open } from "./macos.ts";
export type {
  BuildConfiguration,
  BuildParams,
  BuildSettings,
  Device,
  DeviceType,
  Simulator,
} from "./types.ts";
export {
  getBuildSettings,
  getDeveloperDirectory,
  getDevicePlatformIdentifier,
  parsePlist,
  xcodebuild,
  xcrun,
} from "./xcode.ts";
