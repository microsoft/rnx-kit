import type { Plugin } from "@yarnpkg/core";
import { IgnoreFetcher } from "./IgnoreFetcher.ts";
import { IgnoreResolver } from "./IgnoreResolver.ts";

export { IgnoreFetcher };
export { IgnoreResolver };

const plugin: Plugin = {
  fetchers: [IgnoreFetcher],
  resolvers: [IgnoreResolver],
};

// oxlint-disable-next-line no-default-export
export default plugin;
