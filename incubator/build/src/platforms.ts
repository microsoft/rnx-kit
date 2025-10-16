import type { Ora } from "ora";
import type { BuildParams, Platform } from "./types.ts";

type PlatformImpl = {
  deploy: (artifact: string, param: BuildParams, spinner: Ora) => Promise<void>;
};

export function get(platform: Platform): Promise<PlatformImpl> {
  switch (platform) {
    case "android":
      return import("./platforms/android.ts");
    case "ios":
      return import("./platforms/ios.ts");
    case "macos":
      return import("./platforms/macos.ts");
    case "windows":
      return import("./platforms/windows.ts");
  }
}
