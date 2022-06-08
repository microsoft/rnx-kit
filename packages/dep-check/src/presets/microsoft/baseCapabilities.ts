import type { MetaCapability } from "@rnx-kit/config";
import type { MetaPackage } from "../../types";

const baseCapabilities: Readonly<Record<MetaCapability, MetaPackage>> = {
  "core/testing": {
    name: "#meta",
    capabilities: ["core", "jest", "react-test-renderer"],
  },
};

export default baseCapabilities;
