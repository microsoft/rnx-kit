import { applyEnhancedResolver } from "../../src/resolvers/enhanced-resolve.ts";
import { makeResolverTest } from "./helper.ts";

makeResolverTest("applyEnhancedResolver", applyEnhancedResolver, {
  failed: "Can't resolve",
});
