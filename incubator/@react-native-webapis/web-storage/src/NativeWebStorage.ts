import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Spec extends TurboModule {
  length: () => number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean; // can't use `void` because sync methods must return something
  removeItem(key: string): boolean; // can't use `void` because sync methods must return something
  clear(): boolean; // can't use `void` because sync methods must return something
}

export const NativeWebStorage =
  TurboModuleRegistry.getEnforcing<Spec>("RNWWebStorage");
