import { getAvailablePlatforms } from "@rnx-kit/tools-react-native/platform";
import type { ModuleResolver } from "../types";

export const remapReactNativeModule: ModuleResolver = (
  _context,
  moduleName,
  platform
) => {
  const platformImpl = getAvailablePlatforms()[platform];
  if (platformImpl) {
    if (moduleName === "react-native") {
      return platformImpl;
    } else if (moduleName.startsWith("react-native/")) {
      return `${platformImpl}/${moduleName.slice("react-native/".length)}`;
    }
  }
  return moduleName;
};
