import {
  type Fetcher,
  type FetchOptions,
  type FetchResult,
  type Locator,
} from "@yarnpkg/core";
import { CwdFS, npath, PortablePath, ppath } from "@yarnpkg/fslib";
import * as fs from "node:fs";
import { IGNORE_PROTOCOL, STUB_MODULE, STUB_PACKAGE } from "./constants";

export class IgnoreFetcher implements Fetcher {
  supports(locator: Locator): boolean {
    return locator.reference.startsWith(IGNORE_PROTOCOL);
  }

  getLocalPath(): PortablePath | null {
    return null;
  }

  async fetch(_locator: Locator, opts: FetchOptions): Promise<FetchResult> {
    const base = opts.project.cwd;
    const sourceFs = new CwdFS(base);
    const localPath = ppath.resolve(
      base,
      ".yarn",
      "cache",
      "@rnx-kit-yarn-plugin-ignore-stub"
    );

    const nativePath = npath.fromPortablePath(localPath);
    if (!fs.existsSync(nativePath)) {
      fs.mkdirSync(nativePath, { recursive: true, mode: 0o755 });
      fs.writeFileSync(npath.join(nativePath, "package.json"), STUB_PACKAGE);
      fs.writeFileSync(npath.join(nativePath, "index.js"), STUB_MODULE);
    }

    return {
      packageFs: new CwdFS(localPath, { baseFs: sourceFs }),
      prefixPath: PortablePath.dot,
      discardFromLookup: true,
      localPath: localPath,
    };
  }
}
