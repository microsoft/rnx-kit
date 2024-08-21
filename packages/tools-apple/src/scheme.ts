import { XMLParser } from "fast-xml-parser";
import * as fs from "node:fs";
import * as path from "node:path";

export function findSchemes(xcworkspace: string): string[] {
  const UTF8 = { encoding: "utf-8" } as const;

  const xcworkspacedata = path.join(xcworkspace, "contents.xcworkspacedata");
  const workspace = fs.readFileSync(xcworkspacedata, UTF8);

  const xmlParser = new XMLParser({ ignoreAttributes: false });
  const fileRef = xmlParser.parse(workspace).Workspace.FileRef;
  const refs = Array.isArray(fileRef) ? fileRef : [fileRef];

  const schemes = new Set<string>();
  for (const ref of refs) {
    const location = ref["@_location"];

    // Ignore the project generated by CocoaPods
    if (location.endsWith("/Pods.xcodeproj")) {
      continue;
    }

    const xcschemesDir = path.resolve(
      path.dirname(xcworkspace),
      location.replace("group:", ""),
      "xcshareddata",
      "xcschemes"
    );
    for (const filename of fs.readdirSync(xcschemesDir)) {
      const xcscheme = path.join(xcschemesDir, filename);
      const scheme = xmlParser.parse(fs.readFileSync(xcscheme, UTF8)).Scheme;
      if (scheme.LaunchAction) {
        schemes.add(path.basename(filename, ".xcscheme"));
      }
    }
  }

  return Array.from(schemes);
}
