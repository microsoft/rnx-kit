import type { Ora } from "ora";
import { renderBarcode } from "../qrcode";
import type { BuildParams, Platform } from "../types";

type FirebaseConfig = {
  appId: string | Partial<Record<Platform, string>>;
};

export function deploy(
  _artifact: string,
  _params: BuildParams,
  spinner: Ora
): Promise<void> {
  /**
   * There is currently no public API for downloading apps uploaded to Firebase.
   * See https://stackoverflow.com/a/66418039 and
   * https://stackoverflow.com/q/69642919. For now, we'll just link to the
   * Firebase Console.
   */
  const url = "https://console.firebase.google.com/project/_/appdistribution";
  renderBarcode(url, spinner);
  return Promise.resolve();
}

export function getConfigString(
  platform: Platform,
  config: Partial<FirebaseConfig> | null | undefined
): Promise<string> {
  if (!config) {
    throw new Error("Missing Firebase configuration");
  }

  if (!config.appId) {
    throw new Error(`Missing Firebase app id`);
  }

  const appId =
    typeof config.appId === "object" ? config.appId[platform] : config.appId;
  if (typeof appId !== "string") {
    throw new Error(`Invalid/missing Firebase app id for ${platform}`);
  }

  return Promise.resolve(`firebase:${appId}`);
}
