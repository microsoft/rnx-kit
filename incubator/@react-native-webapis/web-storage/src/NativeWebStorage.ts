import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Spec extends TurboModule {
  length: () => number;
  key: Storage["key"];
  getItem: Storage["getItem"];
  setItem: Storage["setItem"];
  removeItem: Storage["removeItem"];
  clear: Storage["clear"];
}

export const NativeWebStorage =
  TurboModuleRegistry.getEnforcing<Spec>("RNWWebStorage");
