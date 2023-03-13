import type { Ora } from "ora";
import type { BuildParams, Platform } from "./types.js";

type PlatformImpl = {
  deploy: (artifact: string, param: BuildParams, spinner: Ora) => Promise<void>;
};

export function get(platform: Platform): Promise<PlatformImpl> {
  switch (platform) {
    case "android":
      return import("./platforms/android.js");
    case "ios":
      return import("./platforms/ios.js");
    case "macos":
      return import("./platforms/macos.js");
    case "windows":
      return import("./platforms/windows.js");
  }
}
