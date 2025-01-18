import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import type ts from "typescript";
import type { BatchWriter } from "./files";

export type HostEnhancementOptions = {
  platform?: AllPlatforms;
  writer?: BatchWriter;
};

export function createHostEnhancer(options: HostEnhancementOptions) {
  return (host: ts.LanguageServiceHost) => {
    const { writer } = options;
    if (writer) {
      host.writeFile = writer.writeFile;
    }
  };
}
