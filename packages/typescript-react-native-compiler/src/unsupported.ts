import ts from "typescript";

export function reportUnsupportedTscOption(
  unsupportedOptionName: string
): never {
  throw new Error(`tsc option '${unsupportedOptionName}' is not supported`);
}

export function reportUnsupportedTscOptions(
  options: ts.CompilerOptions,
  unsupportedOptionNames: string[]
): void {
  unsupportedOptionNames.forEach((name) => {
    if (options[name] && Object.prototype.hasOwnProperty.call(options, name)) {
      reportUnsupportedTscOption(name);
    }
  });
}
