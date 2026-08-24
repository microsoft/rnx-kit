import { applyOxcResolver } from "../../src/resolvers/oxc-resolver.ts";
import { makeResolverTest } from "./helper.ts";

makeResolverTest("applyOxcResolver", applyOxcResolver, {
  failed: "Cannot find module",
});
