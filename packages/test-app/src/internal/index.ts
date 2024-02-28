import type { NativeSyntheticEvent } from "react-native";
import { NativeModules } from "react-native";
import { getHermesVersion } from "./hermes";
// @ts-expect-error no types for "react-native/Libraries/Core/ReactNativeVersion"
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";

declare global {
  export const RN$Bridgeless: boolean;
}

export function getReactNativeVersion(): string {
  const { major, minor, patch, prerelease } = coreVersion;
  const version = `${major}.${minor}.${patch}`;
  return prerelease ? `${version}-${prerelease.replace("-", "\n")}` : version;
}

export function isBridgeless() {
  return "RN$Bridgeless" in global && RN$Bridgeless === true;
}

export function isFabricInstance<T>(
  ref: NativeSyntheticEvent<T>["currentTarget"]
): boolean {
  return Boolean(
    // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
    ref["__nativeTag"] ||
      // @ts-expect-error — https://github.com/facebook/react-native/blob/0.72-stable/packages/react-native/Libraries/Renderer/public/ReactFabricPublicInstanceUtils.js
      ref["_internalInstanceHandle"]?.stateNode?.canonical
  );
}

export function isRemoteDebuggingAvailable(): boolean {
  return (
    !getHermesVersion() &&
    !isBridgeless() &&
    typeof NativeModules["DevSettings"]?.setIsDebuggingRemotely === "function"
  );
}
