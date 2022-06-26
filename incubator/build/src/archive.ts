import * as os from "node:os";
import * as path from "node:path";
import { ensure, makeCommand, makeCommandSync } from "./command";

export const extract: (filename: string) => Promise<string> = (() => {
  switch (os.platform()) {
    case "darwin":
      // macOS ships bsdtar. bsdtar can extract ZIP files (unlike GNU Tar).
      return untar;

    case "win32": {
      // Windows 10 ships bsdtar since build 17063. Use bsdtar unless we are
      // inside a Git Bash shell. Git Bash ships GNU Tar which does not support
      // ZIP. Luckily, it also ships UnZip.
      const tar = makeCommandSync("tar");
      const output = ensure(tar("--version"));
      return output.includes("bsdtar") ? untar : unzip;
    }

    default:
      return unzip;
  }
})();

export async function untar(archive: string): Promise<string> {
  const buildDir = path.dirname(archive);
  const tar = makeCommand("tar", { cwd: buildDir });

  const filename = path.basename(archive);
  const list = ensure(await tar("tf", filename));

  // Our workflows will always produce build artifacts that are either an APK
  // (Android), an archive (iOS/macOS), or a folder (Windows).
  const file = list.split("\n")[0].trimEnd();

  ensure(await tar("xf", filename));
  return path.join(buildDir, file);
}

export async function unzip(archive: string): Promise<string> {
  const buildDir = path.dirname(archive);
  const unzip = makeCommand("unzip", { cwd: buildDir });

  const filename = path.basename(archive);
  const list = ensure(await unzip("-Z1", filename));

  // Our workflows will always produce build artifacts that are either an APK
  // (Android), an archive (iOS/macOS), or a folder (Windows).
  const file = list.split("\n")[0].trimEnd();

  ensure(await unzip("-o", filename));
  return path.join(buildDir, file);
}
