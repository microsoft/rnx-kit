import { useEffect, useState } from "react";

const useBatteryStatus = () => {
  const [batteryLevel, setBatteryLevel] = useState(-1);
  useEffect(() => {
    // @ts-expect-error Battery Status API is deprecated
    navigator.getBattery().then((status) => {
      setBatteryLevel(status.level);
    });
  }, []);
  return batteryLevel;
};
export default useBatteryStatus;
