import type { MetaPackage } from "../types";
import type { MetaCapability } from "@rnx-kit/config";

export const metaPackages: Readonly<Record<MetaCapability, MetaPackage>> = {
  "core/testing": {
    name: "#meta",
    capabilities: ["core", "jest", "react-test-renderer"],
  },
};

export default metaPackages;
