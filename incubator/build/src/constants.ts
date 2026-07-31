import * as os from "node:os";
import * as path from "node:path";

export const MAX_ATTEMPTS = 8;
export const MAX_DOWNLOAD_ATTEMPTS = 5;

export const BUILD_ID = "rnx-build";
export const CONFIG_DIR = (() => {
  const homedir = os.homedir();
  switch (process.platform) {
    case "darwin": {
      return path.join(homedir, "Library", "Preferences", BUILD_ID);
    }
    case "win32": {
      const appData = process.env.APPDATA;
      const roaming = appData || path.join(homedir, "AppData", "Roaming");
      return path.join(roaming, BUILD_ID, "Config");
    }
    default: {
      const configHome = process.env.XDG_CONFIG_HOME;
      const configDir = configHome || path.join(homedir, ".config");
      return path.join(configDir, BUILD_ID);
    }
  }
})();
export const USER_CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
export const WORKFLOW_ID = BUILD_ID + ".yml";

export const DEPLOYMENT = ["remote-first", "local-only"] as const;
export const DEVICE_TYPES = ["device", "emulator", "simulator"] as const;
export const PLATFORMS = ["android", "ios", "macos", "windows"] as const;
