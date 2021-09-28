import type { MetaPackage } from "../types";

export const coreTestingMeta: MetaPackage = {
  "core/testing": {
    name: "#meta",
    capabilities: ["core", "jest", "react-test-renderer"],
  },
};
