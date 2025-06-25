import type NodeFS from "node:fs";

type FileDescriptor = {
  path: string;
  flags?: NodeFS.OpenMode;
  mode?: NodeFS.Mode | null;
};

export function mockFS(files: Record<string, string>): typeof NodeFS {
  const descriptors: FileDescriptor[] = [];
  const statSync = (p: string) => ({
    isDirectory: () => Object.keys(files).some((f) => f.startsWith(p)),
    isFile: () => p in files,
    isSymbolicLink: () => false,
  });
  return {
    constants: {
      COPYFILE_FICLONE: 2,
    },
    closeSync: (fd: number) => {
      // @ts-expect-error To ensure descriptor stability, we cannot remove elements from the array
      descriptors[fd] = null;
    },
    existsSync: (p: string) => Boolean(files[p]),
    lstatSync: statSync,
    mkdirSync: (p: string, options: unknown) => {
      files[p] = JSON.stringify(options);
    },
    openSync: (path: string, flags, mode) => {
      files[path] = "";
      return descriptors.push({ path, flags, mode }) - 1;
    },
    readFileSync: (p: string) => files[p],
    statSync,
    writeFileSync: (p: string, data: string) => {
      files[p] = data;
    },
    writeSync: (fd: number, data: string) => {
      const descriptor = descriptors[fd];
      if (!descriptor) {
        throw new Error(`Invalid file descriptor: ${fd}`);
      }
      files[descriptor.path] += data;
    },
    promises: {
      copyFile: (source: string, destination: string) => {
        files[destination] = files[source];
      },
      cp: (source: string, destination: string) => {
        files[destination] = files[source];
      },
    },
  } as typeof NodeFS;
}
