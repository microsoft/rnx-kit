import * as fs from "node:fs";
import * as path from "node:path";

function equalFiles(aPath: string, bPath: string): boolean {
  if (fs.lstatSync(aPath).size !== fs.lstatSync(bPath).size) {
    return false;
  }

  const af = fs.openSync(aPath, "r");
  const bf = fs.openSync(bPath, "r");

  const bufsize = 16 * 1024;
  const aBuf = Buffer.alloc(bufsize);
  const bBuf = Buffer.alloc(bufsize);

  try {
    let aRead = 0;
    do {
      aRead = fs.readSync(af, aBuf, 0, aBuf.length, null);
      const bRead = fs.readSync(bf, bBuf, 0, bBuf.length, null);
      if (aRead !== bRead || !aBuf.equals(bBuf)) {
        return false;
      }
    } while (aRead > 0);
  } finally {
    fs.closeSync(af);
    fs.closeSync(bf);
  }

  return true;
}

/**
 * Returns whether the CocoaPods sandbox is in sync with its `Podfile.lock`.
 */
export function checkPodsManifestLock(xcworkspace: string): boolean {
  const workspaceDir = path.dirname(xcworkspace);
  const podfileLock = path.join(workspaceDir, "Podfile.lock");
  const manifestLock = path.join(workspaceDir, "Pods", "Manifest.lock");
  return (
    fs.existsSync(podfileLock) &&
    fs.existsSync(manifestLock) &&
    equalFiles(podfileLock, manifestLock)
  );
}
