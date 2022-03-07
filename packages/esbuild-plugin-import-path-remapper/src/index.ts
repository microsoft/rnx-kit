import type { Plugin } from "esbuild";

const ESBUILD_DEFAULT_EXTENSIONS = [
  ".tsx",
  ".ts",
  ".jsx",
  ".js",
  ".css",
  ".json",
];

const resolvePath = (path: string, resolveDir: string): string | undefined => {
  try {
    return require.resolve(path, { paths: [resolveDir] });
  } catch {
    return undefined;
  }
};

const findMainSourceFile = (
  sourcePath: string,
  resolveDir: string
): string | undefined => {
  const packageJsonPath = resolvePath(`${sourcePath}/package.json`, resolveDir);
  if (!packageJsonPath) {
    return undefined;
  }

  const { main } = require(packageJsonPath);
  const remappedPath = `${sourcePath}/${main.replace(
    /^(?:\.\/)?lib\/(.*)\.jsx?/,
    "src/$1"
  )}`;

  for (const extension of [".ts", ".tsx"]) {
    const resolved = resolvePath(`${remappedPath}${extension}`, resolveDir);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
};

const resolvePathToLib = (
  path: string,
  resolveDir: string,
  resolveExtensions: string[] = []
): string | undefined => {
  const postFixList = [
    "",
    ...resolveExtensions,
    "/index",
    ...resolveExtensions.map((extension) => `/index${extension}`),
  ];

  for (const postFix of postFixList) {
    const resolved = resolvePath(`${path}${postFix}`, resolveDir);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
};

const ImportPathRemapperPlugin = (packageNameFilter: RegExp): Plugin => ({
  name: "resolve-typescript-source",
  setup(build) {
    // Resolve packageName/lib/* to packageName/src/*
    build.onResolve(
      {
        filter: new RegExp(`^${packageNameFilter.source}[/]+[^/]+[/]+lib(.*)`),
      },
      ({ path, resolveDir }) => ({
        path: resolvePathToLib(
          path.replace(
            new RegExp(`^${packageNameFilter.source}[/]+([^/]+)[/]+lib(.*)`),
            `${packageNameFilter.source}/$1/src$2`
          ),
          resolveDir,
          build.initialOptions.resolveExtensions ?? ESBUILD_DEFAULT_EXTENSIONS
        ),
      })
    );

    // Resolve package imports to the TypeScript source of the package.json
    // `main` entry.
    build.onResolve(
      { filter: new RegExp(`^${packageNameFilter.source}[/]+[^/]+[/]*$`) },
      ({ path, resolveDir }) => {
        // Check if the package being resolved is marked as external. If so, it should stay external
        // and we should not try to resolve it to a TypeScript module.
        const external = Boolean(build.initialOptions.external?.includes(path));
        if (external) {
          return { path, external };
        } else {
          return { path: findMainSourceFile(path, resolveDir), external };
        }
      }
    );
  },
});

module.exports = ImportPathRemapperPlugin;
