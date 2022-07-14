import type { Ora } from "ora";
import type { BuildParams, Platform } from "./types";

type PlatformImpl = {
  deploy: (artifact: string, param: BuildParams, spinner: Ora) => Promise<void>;
};

export function get(platform: Platform): Promise<PlatformImpl> {
  switch (platform) {
    case "android":
      return import("./platforms/android");
    case "ios":
      return import("./platforms/ios");
    case "macos":
      return import("./platforms/macos");
    case "windows":
      return import("./platforms/windows");
  }
}
