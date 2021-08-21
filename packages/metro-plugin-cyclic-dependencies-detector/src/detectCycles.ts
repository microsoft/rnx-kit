import { error, warn } from "@rnx-kit/console";
import { getPackageModuleRefFromModulePath } from "@rnx-kit/tools-node/module";
import type { Dependencies, Graph } from "metro";
import * as path from "path";

export type CyclicDependencies = Record<string, string[]>;

export type PluginOptions = {
  includeNodeModules?: boolean;
  linesOfContext?: number;
  throwOnError?: boolean;
};

export function packageRelativePath(
  modulePath: string,
  cache: Record<string, string>
): string {
  const cachedPath = cache[modulePath];
  if (cachedPath) {
    return cachedPath;
  }

  const ref = getPackageModuleRefFromModulePath(modulePath);
  const relativePath = ref
    ? path.join(ref.scope ?? "", ref.name, ref.path ?? "")
    : "";

  cache[modulePath] = relativePath;
  return relativePath;
}

export function traverseDependencies(
  currentModule: string,
  dependencies: Dependencies,
  options: PluginOptions,
  cyclicDependencies: CyclicDependencies = {},
  stack: string[] = []
): CyclicDependencies {
  if (!options.includeNodeModules && currentModule.includes("node_modules")) {
    return cyclicDependencies;
  }

  if (stack.includes(currentModule)) {
    cyclicDependencies[currentModule] = stack.slice();
    return cyclicDependencies;
  }

  stack.push(currentModule);

  dependencies.get(currentModule)?.dependencies?.forEach((dependency) => {
    if (dependency["__rnxCyclicDependenciesChecked"]) {
      return;
    }

    traverseDependencies(
      dependency.absolutePath,
      dependencies,
      options,
      cyclicDependencies,
      stack
    );

    // Performance optimization: There is no need to traverse this module again.
    dependency["__rnxCyclicDependenciesChecked"] = true;
  });

  stack.pop();
  return cyclicDependencies;
}

export function detectCycles(
  entryPoint: string,
  { dependencies }: Graph,
  options: PluginOptions
): void {
  const cyclicDependencies = traverseDependencies(
    entryPoint,
    dependencies,
    options
  );

  const modulePaths = Object.keys(cyclicDependencies);
  if (modulePaths.length === 0) {
    return;
  }

  const { linesOfContext = 1, throwOnError = true } = options;
  const cachedPaths: Record<string, string> = {};

  modulePaths.forEach((modulePath) => {
    const currentModule = packageRelativePath(modulePath, cachedPaths);
    warn(currentModule);

    const requirePath = cyclicDependencies[modulePath];
    const start = Math.max(requirePath.indexOf(modulePath) - linesOfContext, 0);
    requirePath
      .slice(start)
      .reverse()
      .forEach((module, index) => {
        const requiredBy = packageRelativePath(module, cachedPaths);
        warn(`${"    ".repeat(index)}└── ${requiredBy}`);
      });
    console.log();
  });

  if (throwOnError) {
    throw new Error("Import cycles detected");
  } else {
    error("Import cycles detected!");
  }
}
