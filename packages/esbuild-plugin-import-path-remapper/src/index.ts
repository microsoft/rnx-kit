const resolvePath = (path, resolveDir) => {
  try {
    return require.resolve(path, { paths: [resolveDir] });
  } catch {
    return undefined;
  }
};

const findMainSourceFile = (sourcePath, resolveDir) => {
  const { main } = require(require.resolve(`${sourcePath}/package.json`, {
    paths: [resolveDir],
  }));

  if (!main) {
    return;
  }

  const remappedPath = `${sourcePath}/${main.replace(
    /^(?:\.\/)?lib\/(.*)\.js/,
    "src/$1"
  )}`;

  for (const extension of [".ts", ".tsx"]) {
    const resolved = resolvePath(`${remappedPath}${extension}`, resolveDir);
    if (resolved) {
      return resolved;
    }
  }
};

const resolvePathToLib = (path, resolveDir, resolveExtensions = []) => {
  const postFixList = [
    "",
    ...resolveExtensions,
    ...resolveExtensions.map((extension) => `/index${extension}`),
  ];

  for (const postFix of postFixList) {
    const resolved = resolvePath(`${path}${postFix}`, resolveDir);
    if (resolved) {
      return resolved;
    }
  }
};

const ImportPathRemapperPlugin = (packagePrefix) => ({
  name: "resolve-typescript-source",
  setup(build) {
    // Resolve packageName/lib/* to packageName/src/*
    build.onResolve(
      { filter: new RegExp(`^${packagePrefix}[/]+[^/]+[/]+lib([/]+.*)`) },
      ({ path, resolveDir }) => ({
        path: resolvePathToLib(
          path.replace(
            new RegExp(`^${packagePrefix}[/]+([^/]+)[/]+lib([/]+.*)`),
            `${packagePrefix}/$1/src$2`
          ),
          resolveDir,
          build.initialOptions.resolveExtensions
        ),
      })
    );

    // Resolve package imports to the TypeScript source of the package.json
    // `main` entry.
    build.onResolve(
      { filter: new RegExp(`^${packagePrefix}[/]+[^/]+[/]*$`) },
      ({ path, resolveDir }) => ({
        path: findMainSourceFile(path, resolveDir),
      })
    );
  },
});

module.exports = ImportPathRemapperPlugin;
