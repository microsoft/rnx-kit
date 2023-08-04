import type { BatteryStatus } from "./NativeBatteryStatus";
import NativeBatteryStatus from "./NativeBatteryStatus";

const navigator = global.navigator || {};

// @ts-expect-error TS2339: Property 'getBattery' does not exist on type 'Navigator'.
navigator.getBattery = (): Promise<BatteryStatus> => {
  return new Promise((resolve) => {
    NativeBatteryStatus.getStatus().then(
      ({ charging, chargingTime, dischargingTime, level }) => {
        resolve({
          charging: Boolean(charging),
          chargingTime: chargingTime < 0 ? Infinity : chargingTime,
          dischargingTime: dischargingTime < 0 ? Infinity : dischargingTime,
          level,
        });
      }
    );
  });
};

if (navigator !== global.navigator) {
  global.navigator = navigator;
}
