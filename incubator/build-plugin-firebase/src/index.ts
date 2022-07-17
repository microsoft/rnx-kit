import { renderQRCode } from "@rnx-kit/build";
import type { DistributionPlugin, Platform } from "@rnx-kit/build";

type FirebaseConfig = {
  appId: string | Partial<Record<Platform, string>>;
};

module.exports = (config: Partial<FirebaseConfig>): DistributionPlugin => {
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
      if (!config) {
        throw new Error("Missing Firebase configuration");
      }

      if (!config.appId) {
        throw new Error(`Missing Firebase app id`);
      }

      const appId =
        typeof config.appId === "object"
          ? config.appId[platform]
          : config.appId;
      if (typeof appId !== "string") {
        throw new Error(`Invalid/missing Firebase app id for ${platform}`);
      }

      return Promise.resolve(`firebase:${appId}`);
    },
  };
};
