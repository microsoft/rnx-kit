import ts from "typescript";

function versionNumber(version: string): number {
  const [major, minor = 0, patch = 0] = version.split("-")[0].split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

function greaterThanOrEqualTo(lhs: string, rhs: string): boolean {
  return versionNumber(lhs) >= versionNumber(rhs);
}

export function requireTypescriptVersion(version: string): boolean {
  return greaterThanOrEqualTo(ts.version, version);
}

const toTarget: Record<string, ts.ScriptTarget> = {
  es3: ts.ScriptTarget.ES3,
  es5: ts.ScriptTarget.ES5,
  es6: ts.ScriptTarget.ES2015,
  es2016: ts.ScriptTarget.ES2016,
  es2017: ts.ScriptTarget.ES2017,
  es2018: ts.ScriptTarget.ES2018,
  es2019: ts.ScriptTarget.ES2019,
  es2020: ts.ScriptTarget.ES2020,
  es2021: ts.ScriptTarget.ES2021,
  es2022: ts.ScriptTarget.ES2022,
  esnext: ts.ScriptTarget.ESNext,
};

const toModule: Record<string, ts.ModuleKind> = {
  none: ts.ModuleKind.None,
  commonjs: ts.ModuleKind.CommonJS,
  amd: ts.ModuleKind.AMD,
  system: ts.ModuleKind.System,
  umd: ts.ModuleKind.UMD,
  es6: ts.ModuleKind.ES2015,
  es2015: ts.ModuleKind.ES2015,
  es2020: ts.ModuleKind.ES2020,
  esnext: ts.ModuleKind.ESNext,
};

function convertToType<T>(
  entry: Record<string, T>,
  value: string | T | undefined
): T | undefined {
  return typeof value === "string" ? entry[value.toLowerCase()] : value;
}

export function sanitizeOptions(
  options: ts.CompilerOptions
): ts.CompilerOptions {
  const module = options.module || ts.ModuleKind.CommonJS;
  const target = options.target || ts.ScriptTarget.ES2015;
  return {
    ...options,
    module: convertToType(toModule, module),
    target: convertToType(toTarget, target),
  };
}
