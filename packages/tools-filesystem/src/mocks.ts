type NodeFS = typeof import("node:fs");

export function mockFS(files: Record<string, string>): NodeFS {
  const statSync = (p: string) => ({
    isDirectory: () => Object.keys(files).some((f) => f.startsWith(p)),
    isFile: () => p in files,
    isSymbolicLink: () => false,
  });
  return {
    constants: {
      COPYFILE_FICLONE: 2,
    },
    existsSync: (p: string) => Boolean(files[p]),
    lstatSync: statSync,
    mkdirSync: (p: string, options: unknown) => {
      files[p] = JSON.stringify(options);
    },
    readFileSync: (p: string) => files[p],
    statSync,
    writeFileSync: (p: string, data: string) => {
      files[p] = data;
    },
    promises: {
      copyFile: (source: string, destination: string) => {
        files[destination] = files[source];
      },
      cp: (source: string, destination: string) => {
        files[destination] = files[source];
      },
    },
  } as NodeFS;
}
