import { Volume, createFsFromVolume } from "memfs";
import type NodeFS from "node:fs";

export type MockFS = typeof NodeFS & { vol: Volume };

/**
 * Create a usage wrapper around memfs that provides a NodeFS-compatible API, allows for optional
 * initialization of files, and exposes the volume for access when needed
 * @param startingFiles optional object with starting files and their content
 * @returns a mockfs instance
 */
export function mockFS(startingFiles?: Record<string, string>): MockFS {
  const vol = new Volume();
  vol.mkdirSync(process.cwd(), { recursive: true });
  if (startingFiles && Object.keys(startingFiles).length > 0) {
    vol.fromJSON(startingFiles, process.cwd());
  }
  const newfs = createFsFromVolume(vol) as unknown as MockFS;
  newfs.vol = vol;
  return newfs;
}

/**
 * Retrieve the valid file entries from the mock filesystem as a simple object mapping file paths to their content.
 *
 * NOTE: file paths returned are always absolute. If the input paths were relative, they will not match the returned
 * results
 * @param fs mock filesystem to retrieve file entries from
 * @returns an object mapping file paths to their content
 */
export function getMockFSFiles(fs: MockFS): Record<string, string> {
  const fileEntries = fs.vol.toJSON();
  // create a new object without any null values
  const files: Record<string, string> = {};
  for (const [key, value] of Object.entries(fileEntries)) {
    if (value !== null) {
      files[key] = value as string;
    }
  }
  return files;
}
