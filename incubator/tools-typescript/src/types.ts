import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import type ts from "typescript";

export type PackageInfo = {
  // name of the package
  name: string;

  // root directory of the package
  root: string;

  // available react-native platforms
  platforms?: AllPlatforms[];

  // typescript configuration
  tsconfig?: ts.ParsedCommandLine;
};
