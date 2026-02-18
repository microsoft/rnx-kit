import type NodeFS from "node:fs";
import { Readable } from "node:stream";
import { createDirCache } from "./dirCache.ts";
import { createEnoentError } from "./errors.ts";
import { createFileCache } from "./fileCache.ts";

type FileDescriptor = {
  path: string;
  flags?: NodeFS.OpenMode;
  mode?: NodeFS.Mode | null;
  position: number;
};

export function mockFS(startingFiles: Record<string, string>): typeof NodeFS {
  const descriptors: (FileDescriptor | null)[] = [];
  const directories = createDirCache();
  const files = createFileCache(directories, startingFiles);

  return {
    constants: {
      COPYFILE_FICLONE: 2,
    },
    closeSync: (fd: number) => {
      descriptors[fd] = null;
    },
    existsSync: (p: string) => files.has(p) || directories.has(p),
    lstatSync: files.stat as typeof NodeFS.lstatSync,
    mkdirSync: (p: string, options: unknown) => {
      directories.add(p);
      if (options) {
        files.set(p, JSON.stringify(options));
      }
    },
    openSync: (
      filePath: string,
      flags?: NodeFS.OpenMode,
      mode?: NodeFS.Mode | null
    ) => {
      if (flags === "r") {
        // access the file content to trigger an error if the file doesn't exist
        files.get(filePath);
      } else {
        files.set(filePath, "");
      }
      return descriptors.push({ path: filePath, flags, mode, position: 0 }) - 1;
    },
    readFileSync: (p: string, _options?: unknown) => {
      return files.get(p);
    },
    readSync: (
      fd: number,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number | null
    ) => {
      const descriptor = descriptors[fd];
      if (!descriptor) {
        throw new Error(`Invalid file descriptor: ${fd}`);
      }
      const content = Buffer.from(files.get(descriptor.path), "utf-8");
      const readPos = position ?? descriptor.position;
      if (readPos >= content.length) {
        return 0;
      }
      const bytesToRead = Math.min(length, content.length - readPos);
      content.copy(buffer, offset, readPos, readPos + bytesToRead);
      descriptor.position = readPos + bytesToRead;
      return bytesToRead;
    },
    createReadStream: (path: string, options?: { highWaterMark?: number }) => {
      if (!files.has(path)) {
        return new Readable({
          read() {
            this.destroy(createEnoentError(path, "open"));
          },
        });
      }
      const content = Buffer.from(files.get(path), "utf-8");
      let pos = 0;
      return new Readable({
        highWaterMark: options?.highWaterMark ?? 64 * 1024,
        read(size) {
          if (pos >= content.length) {
            this.push(null);
            return;
          }
          const chunk = content.subarray(pos, pos + size);
          pos += chunk.length;
          this.push(chunk);
        },
      });
    },
    statSync: files.stat as typeof NodeFS.statSync,
    writeFileSync: (p: string, data: string) => {
      files.set(p, data);
    },
    writeSync: (fd: number, data: string) => {
      const descriptor = descriptors[fd];
      if (!descriptor) {
        throw new Error(`Invalid file descriptor: ${fd}`);
      }
      files.set(descriptor.path, files.get(descriptor.path) + data);
    },
    promises: {
      copyFile: async (source: string, destination: string) => {
        files.set(destination, files.get(source));
      },
      cp: async (source: string, destination: string) => {
        files.set(destination, files.get(source));
      },
      stat: async (p: string, options?: { bigint?: boolean }) => {
        return files.stat(p, options);
      },
      readFile: async (p: string, _options?: unknown) => {
        return files.get(p);
      },
      writeFile: async (p: string, data: string, _options?: unknown) => {
        files.set(p, data);
      },
      mkdir: async (p: string, options: unknown) => {
        directories.add(p);
        if (options) {
          files.set(p, JSON.stringify(options));
        }
      },
    },
  } as typeof NodeFS;
}
