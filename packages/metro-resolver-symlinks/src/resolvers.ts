import { info } from "@rnx-kit/console";
import { applyEnhancedResolver } from "./resolvers/enhanced-resolve.ts";
import { applyMetroResolver } from "./resolvers/metro-resolver.ts";
import { applyOxcResolver } from "./resolvers/oxc-resolver.ts";
import type { CallResolver, Options } from "./types.ts";
import {
  patchMetro,
  shouldEnableRetryResolvingFromDisk,
} from "./utils/metro.ts";

export function getResolver(options: Options): CallResolver {
  const retryFromDisk = shouldEnableRetryResolvingFromDisk(options);
  if (retryFromDisk) {
    patchMetro(options);
  }

  switch (options.resolver) {
    case "enhanced-resolve":
      return applyEnhancedResolver;
    case "oxc-resolver":
      info("Note: Oxc Resolver support is still experimental");
      return applyOxcResolver;
    default:
      return retryFromDisk ? applyEnhancedResolver : applyMetroResolver;
  }
}
