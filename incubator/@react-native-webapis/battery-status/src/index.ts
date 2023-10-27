import type { BatteryStatus } from "./NativeBatteryStatus";
import { NativeBatteryStatus } from "./NativeBatteryStatus";

function getBattery(): Promise<BatteryStatus> {
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
}

Object.defineProperty(getBattery, "_isPolyfilledBy", {
  value: "@react-native-webapis/battery-status",
  writable: false,
});

const navigator = global.navigator || {};

Object.defineProperty(navigator, "getBattery", {
  value: getBattery,
  writable: false,
});

if (navigator !== global.navigator) {
  global.navigator = navigator;
}
