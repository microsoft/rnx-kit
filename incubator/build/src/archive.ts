import * as fs from "node:fs";
import * as path from "node:path";
import yauzl from "yauzl";

export function extract(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const destination = path.dirname(filename);
    yauzl.open(filename, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        reject(err);
      }

      zipFile.readEntry();
      zipFile.on("entry", (entry) => {
        zipFile.openReadStream(entry, (err, readStream) => {
          if (err) {
            reject(err);
          }

          const entryFilename = path.join(destination, entry.fileName);
          readStream
            .pipe(fs.createWriteStream(entryFilename))
            .once("finish", () => resolve(entryFilename));
        });
      });
    });
  });
}
