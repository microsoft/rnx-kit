export type Device = {
  simulator: boolean;
  operatingSystemVersion: string;
  interface?: string;
  available: boolean;
  platform:
    | "com.apple.platform.appletvos"
    | "com.apple.platform.appletvsimulator"
    | "com.apple.platform.driverkit"
    | "com.apple.platform.iphoneos"
    | "com.apple.platform.iphonesimulator"
    | "com.apple.platform.macosx"
    | "com.apple.platform.watchos"
    | "com.apple.platform.watchsimulator"
    | "com.apple.platform.xros"
    | "com.apple.platform.xrsimulator";
  modelCode: string;
  identifier: string;
  architecture: "arm64" | "arm64e" | "x86_64" | "x86_64h";
  modelUTI: string;
  modelName: string;
  name: string;
  ignored: boolean;
};

export type DeviceType = "device" | "emulator" | "simulator";

export type JSObject = {
  [key: string]: string | number | boolean | JSObject | JSObject[];
};

export type Logger = {
  start: (str?: string) => void;
  succeed: (str?: string) => void;
  fail: (str?: string) => void;
  info: (str: string) => void;
};

export type Simulator = {
  name: string;
  state: "Booted" | "Shutdown";
  deviceTypeIdentifier: string;
  isAvailable: boolean;
  udid: string;
  logPath: string;
  dataPathSize: number;
  dataPath: string;
  availabilityError?: string;
};

export type BuildConfiguration = "Debug" | "Release";

export type BuildParams =
  | {
      platform: "ios" | "visionos";
      scheme?: string;
      destination?: DeviceType;
      configuration?: BuildConfiguration;
      archs?: string;
      isBuiltRemotely?: boolean;
    }
  | {
      platform: "macos";
      scheme?: string;
      configuration?: BuildConfiguration;
      isBuiltRemotely?: boolean;
    };

export type BuildSettings = {
  action: string;
  buildSettings: {
    EXECUTABLE_FOLDER_PATH: string;
    FULL_PRODUCT_NAME: string;
    PRODUCT_BUNDLE_IDENTIFIER: string;
    TARGET_BUILD_DIR: string;
    WRAPPER_EXTENSION?: string;
  };
  target: string;
};
