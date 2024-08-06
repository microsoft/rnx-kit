type NodeFS = typeof import("node:fs");

export function mockFS(files: Record<string, string>): NodeFS {
  return {
    existsSync: (p: string) => Boolean(files[p]),
    mkdirSync: (p: string, options: unknown) => {
      files[p] = JSON.stringify(options);
    },
    readFileSync: (p: string) => files[p],
    writeFileSync: (p: string, data: string) => {
      files[p] = data;
    },
    promises: {
      cp: (source: string, destination: string) => {
        files[destination] = files[source];
      },
    },
  } as NodeFS;
}
