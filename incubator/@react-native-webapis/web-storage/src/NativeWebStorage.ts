import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Spec extends TurboModule {
  length: () => number;
  key: (index: number) => string | undefined;
  getItem: (key: string) => string | undefined;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("RNWWebStorage");
