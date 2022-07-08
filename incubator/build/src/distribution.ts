import { getKitConfig } from "@rnx-kit/config";
import type { Deployment, Distribution, Platform } from "./types";

function getDistribution(
  deployment: Deployment,
  service: string | number | boolean | undefined
): Promise<Distribution> {
  if (deployment === "autodetect") {
    switch (service) {
      case "firebase": {
        return import("./distribution/firebase");
      }
    }
  }

  return import("./distribution/local");
}

export async function getDistributionConfig(
  deployment: Deployment,
  platform: Platform,
  projectRoot: string
): Promise<[Distribution, string]> {
  const kitConfig = getKitConfig({ cwd: projectRoot });
  const distConfig = kitConfig?.build?.distribution;
  const dist = await getDistribution(deployment, distConfig?.service);
  const config = await dist.getConfigString(platform, distConfig);
  return [dist, config];
}
