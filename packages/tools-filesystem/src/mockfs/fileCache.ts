import type NodeFS from "node:fs";
import type { createDirCache } from "./dirCache.ts";
import { createEnoentError } from "./errors.ts";

export type FileDescriptor = {
  path: string;
  flags?: NodeFS.OpenMode;
  mode?: NodeFS.Mode | null;
  position: number;
};

export function createFileCache(
  dirCache: ReturnType<typeof createDirCache>,
  startingFiles: Record<string, string>
) {
  const files = startingFiles;
  const inodes: Record<string, bigint> = {};
  let nextInode = 1n;

  function has(p: string): boolean {
    return p in files;
  }

  function get(p: string): string {
    if (has(p)) {
      return files[p];
    }
    throw createEnoentError(p, "get");
  }

  function set(p: string, data: string): void {
    dirCache.addFile(p);
    files[p] = data;
  }

  // Register initial files with the directory cache
  for (const filePath of Object.keys(files)) {
    dirCache.addFile(filePath);
  }

  // Helper to create BigIntStats for a file or directory
  function createBigIntStats(p: string, isDir: boolean): NodeFS.BigIntStats {
    const ino = (inodes[p] ??= nextInode++);
    const size = isDir
      ? 0n
      : BigInt(Buffer.byteLength(files[p] ?? "", "utf-8"));
    const now = BigInt(Date.now()) * 1000000n;
    return {
      dev: 1n,
      ino,
      mode: isDir ? 0o40755n : 0o100644n,
      nlink: 1n,
      uid: 0n,
      gid: 0n,
      rdev: 0n,
      size,
      blksize: 4096n,
      blocks: 0n,
      atimeMs: now / 1000000n,
      mtimeMs: now / 1000000n,
      ctimeMs: now / 1000000n,
      birthtimeMs: now / 1000000n,
      atime: new Date(Number(now / 1000000n)),
      mtime: new Date(Number(now / 1000000n)),
      ctime: new Date(Number(now / 1000000n)),
      birthtime: new Date(Number(now / 1000000n)),
      atimeNs: now,
      mtimeNs: now,
      ctimeNs: now,
      birthtimeNs: now,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isSymbolicLink: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
    } as NodeFS.BigIntStats;
  }

  function bigIntStatsToStats(stats: NodeFS.BigIntStats): NodeFS.Stats {
    return {
      ...stats,
      dev: Number(stats.dev),
      ino: Number(stats.ino),
      mode: Number(stats.mode),
      nlink: Number(stats.nlink),
      uid: Number(stats.uid),
      gid: Number(stats.gid),
      rdev: Number(stats.rdev),
      size: Number(stats.size),
      blksize: Number(stats.blksize),
      blocks: Number(stats.blocks),
    } as unknown as NodeFS.Stats;
  }

  function stat(
    p: string,
    options?: { throwIfNoEntry?: boolean; bigint?: boolean }
  ): NodeFS.BigIntStats | NodeFS.Stats | undefined {
    const isDir = dirCache.has(p);
    const isFile = p in files && !isDir;
    if (!isDir && !isFile) {
      if (options?.throwIfNoEntry === false) {
        return undefined as unknown as NodeFS.BigIntStats;
      }
      throw createEnoentError(p, "stat");
    }
    const bigIntStats = createBigIntStats(p, isDir);
    if (options?.bigint) {
      return bigIntStats;
    }
    return bigIntStatsToStats(bigIntStats);
  }

  return { has, get, set, stat };
}
