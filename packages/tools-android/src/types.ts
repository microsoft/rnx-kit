export type BuildConfiguration = "Debug" | "Release";

export type DeviceType = "device" | "emulator" | "simulator";

export type EmulatorInfo = {
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

export type Logger = {
  start: (str?: string) => void;
  succeed: (str?: string) => void;
  fail: (str?: string) => void;
  info: (str: string) => void;
  warn: (str: string) => void;
};

export type PhysicalDeviceInfo = {
  usb: string;
  product: string;
  model: string;
  device: string;
  transport_id: string;
};

export type BuildParams = {
  platform: "android";
  destination?: DeviceType;
  configuration?: BuildConfiguration;
  archs?: string;
};

export type DeviceInfo = {
  serial: string;
  state: "offline" | "device" | string;
  description: EmulatorInfo | PhysicalDeviceInfo;
};

export type PackageInfo = {
  packageName: string;
  activityName: string;
};
