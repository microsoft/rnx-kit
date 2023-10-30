import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

// https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API
export type BatteryStatus = {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface Spec extends TurboModule {
  getStatus(): Promise<BatteryStatus>;
}

export const NativeBatteryStatus =
  TurboModuleRegistry.getEnforcing<Spec>("RNWBatteryStatus");
