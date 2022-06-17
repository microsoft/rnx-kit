import * as fs from "node:fs";
import yauzl from "yauzl";

export function extract(filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
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

          const writeStream = fs.createWriteStream(entry.fileName);
          readStream
            .pipe(writeStream)
            .once("finish", () => resolve(entry.fileName));
        });
      });
    });
  });
}
