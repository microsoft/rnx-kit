import { renderQRCode } from "@rnx-kit/build/qrcode";
import type { Platform, PluginInterface } from "@rnx-kit/build/types";

type FirebaseConfig = Partial<{
  appId: string | Partial<Record<Platform, string>>;
}>;

function validateConfig(
  config: FirebaseConfig | undefined
): asserts config is FirebaseConfig {
  if (!config) {
    throw new Error("Missing Firebase configuration");
  }

  const { appId } = config;
  if (!appId) {
    throw new Error(`Missing Firebase app id`);
  }

  if (typeof appId === "object") {
    const errors = Object.entries(appId).reduce((errors, [platform, id]) => {
      if (typeof id !== "string") {
        console.error(`Invalid Firebase app id for '${platform}': ${id}`);
        return errors + 1;
      }
      return errors;
    }, 0);
    if (errors > 0) {
      throw new Error(`Invalid Firebase app ids`);
    }
  } else if (typeof appId !== "string") {
    throw new Error(`Invalid Firebase app id: ${appId}`);
  }
}

export const distribution: PluginInterface["distribution"] = (
  config?: FirebaseConfig
) => {
  validateConfig(config);

  return {
    deploy: (_context, _artifact, spinner) => {
      /**
       * There is currently no public API for downloading apps uploaded to
       * Firebase. See https://stackoverflow.com/a/66418039 and
       * https://stackoverflow.com/q/69642919. For now, we'll just link to the
       * Firebase Console.
       */
      const url =
        "https://console.firebase.google.com/project/_/appdistribution";
      renderQRCode(url, spinner);
      return Promise.resolve();
    },
    getConfigString: (platform) => {
      const appId =
        typeof config.appId === "object"
          ? config.appId[platform]
          : config.appId;
      return Promise.resolve(`firebase:${appId}`);
    },
  };
};
