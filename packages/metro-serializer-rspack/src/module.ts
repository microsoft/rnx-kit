import type { Module } from "metro";

export function outputOf(module: Module | undefined): string | undefined {
  if (!module) {
    return undefined;
  }

  const jsModules = module.output.filter(({ type }) => type.startsWith("js/"));
  if (jsModules.length !== 1) {
    throw new Error(
      `Modules must have exactly one JS output, but ${module.path} has ${jsModules.length}`
    );
  }

  const code = jsModules[0].data.code;
  /*
  const moduleWithModuleNameOnly = {
    ...module,
    // esbuild only needs the base file name. It derives the path from the
    // imported path, and appends the file name to it. If we don't trim the path
    // here, we will end up with "double" paths, e.g.
    // `src/Users/<user>/Source/rnx-kit/packages/test-app/src/App.native.tsx`.
    path: path.basename(module.path),
  };

  return `${code}\n${generateSourceMappingURL([moduleWithModuleNameOnly])}\n`;
  */
  return code;
}
