import { error, warn } from "@rnx-kit/console";
import { getPackageModuleRefFromModulePath } from "@rnx-kit/tools-node/module";
import type { ReadOnlyDependencies, ReadOnlyGraph } from "metro";
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
  dependencies: ReadOnlyDependencies,
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

  const moduleDependencies = dependencies.get(currentModule)?.dependencies;
  if (moduleDependencies) {
    for (const dependency of moduleDependencies.values()) {
      if (dependency["__rnxCyclicDependenciesChecked"]) {
        continue;
      }

      const { absolutePath } = dependency;
      if (absolutePath) {
        traverseDependencies(
          absolutePath,
          dependencies,
          options,
          cyclicDependencies,
          stack
        );
      }

      // Performance optimization: There is no need to traverse this module again.
      dependency["__rnxCyclicDependenciesChecked"] = true;
    }
  }

  stack.pop();
  return cyclicDependencies;
}

export function detectCycles(
  entryPoint: string,
  { dependencies }: ReadOnlyGraph,
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

  for (const modulePath of modulePaths) {
    const currentModule = packageRelativePath(modulePath, cachedPaths);
    warn(currentModule);

    const requirePath = cyclicDependencies[modulePath];
    const start = Math.max(requirePath.indexOf(modulePath) - linesOfContext, 0);
    const stack = requirePath.slice(start).reverse();
    const length = stack.length;
    for (let i = 0; i < length; ++i) {
      const requiredBy = packageRelativePath(stack[i], cachedPaths);
      warn(`${"    ".repeat(i)}└── ${requiredBy}`);
    }
    console.log();
  }

  if (throwOnError) {
    throw new Error("Import cycles detected");
  } else {
    error("Import cycles detected!");
  }
}
