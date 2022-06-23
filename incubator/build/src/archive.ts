import * as fs from "node:fs";
import * as path from "node:path";
import yauzl from "yauzl";
import { ensure, makeCommand } from "./command";

export function extract(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mkdirOptions = { recursive: true, mode: 0o755 } as const;
    const destination = path.dirname(filename);

    yauzl.open(filename, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        reject(err);
      }

      const readNextEntry = () => zipFile.readEntry();
      let output = "";

      zipFile.on("entry", (entry) => {
        zipFile.openReadStream(entry, (err, readStream) => {
          if (err) {
            reject(err);
          }

          const absolutePath = path.join(destination, entry.fileName);

          // Our workflows will always produce build artifacts that are either
          // an APK (Android), an archive (iOS/macOS), or a folder (Windows).
          output ||= absolutePath;

          if (absolutePath.endsWith("/") || absolutePath.endsWith("\\")) {
            fs.mkdir(absolutePath, mkdirOptions, readNextEntry);
          } else {
            readStream
              .pipe(fs.createWriteStream(absolutePath))
              .once("finish", readNextEntry);
          }
        });
      });
      zipFile.once("end", () => resolve(output));

      readNextEntry();
    });
  });
}

export async function untar(archive: string): Promise<string> {
  const buildDir = path.dirname(archive);
  const tar = makeCommand("tar", { cwd: buildDir });

  const filename = path.basename(archive);
  const list = ensure(await tar("tf", filename));
  const m = list.match(/(.*?)\//);
  if (!m) {
    throw new Error(`Failed to determine content of ${archive}`);
  }

  ensure(await tar("xf", filename));
  return path.join(buildDir, m[1]);
}
