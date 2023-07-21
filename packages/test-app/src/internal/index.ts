import { NativeModules } from "react-native";
// @ts-expect-error no types for "react-native/Libraries/Core/ReactNativeVersion"
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";

export function getReactNativeVersion() {
  const version = `${coreVersion.major}.${coreVersion.minor}.${coreVersion.patch}`;
  return coreVersion.prerelease
    ? version + `-${coreVersion.prerelease}`
    : version;
}

export function getRemoteDebuggingAvailability() {
  return (
    // @ts-expect-error `RN$Bridgeless` is a react-native internal property
    global.RN$Bridgeless !== true &&
    typeof NativeModules["DevSettings"]?.setIsDebuggingRemotely === "function"
  );
}
