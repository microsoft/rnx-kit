import type { MetaCapability } from "@rnx-kit/config-types";
import type { MetaPackage } from "../../../types.ts";

export const baseCapabilities: Readonly<Record<MetaCapability, MetaPackage>> = {
  "core/testing": {
    name: "#meta",
    capabilities: ["core", "jest", "react-test-renderer"],
  },
};
