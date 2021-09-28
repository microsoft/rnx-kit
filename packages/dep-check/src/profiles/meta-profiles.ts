import type { Profile } from "../types";

export const metaPackages: Profile = {
  "core/testing": {
    name: "#meta",
    capabilities: ["core", "jest", "react-test-renderer"],
  },
};

export default metaPackages;
