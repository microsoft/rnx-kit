import { info } from "@rnx-kit/console";
import { applyEnhancedResolver } from "./resolvers/enhanced-resolve";
import { applyMetroResolver } from "./resolvers/metro-resolver";
import { applyOxcResolver } from "./resolvers/oxc-resolver";
import type { CallResolver, Options } from "./types";
import {
  patchMetro,
  shouldEnableRetryResolvingFromDisk,
} from "./utils/patchMetro";

export function getResolver(options: Options): CallResolver {
  if (shouldEnableRetryResolvingFromDisk(options)) {
    patchMetro(options);
    return applyEnhancedResolver;
  }

  switch (options.resolver) {
    case "enhanced-resolve":
      return applyEnhancedResolver;
    case "oxc-resolver":
      info("Note: Oxc Resolver support is still experimental");
      return applyOxcResolver;
    default:
      return applyMetroResolver;
  }
}
