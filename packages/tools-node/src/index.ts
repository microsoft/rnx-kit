export {
  getPackageModuleRefFromModulePath,
  isFileModuleRef,
  isPackageModuleRef,
  parseModuleRef,
} from "./module.ts";
export type { FileModuleRef, PackageModuleRef } from "./module.ts";

export type { PackageManifest, PackagePerson } from "@rnx-kit/core-types";
export {
  destructureModuleRef,
  findPackage,
  findPackageDependencyDir,
  findPackageDir,
  parsePackageRef,
  readPackage,
  resolveDependencyChain,
  writePackage,
} from "./package.ts";
export type {
  DestructuredModuleRef,
  FindPackageDependencyOptions,
  PackageRef,
} from "./package.ts";

export { findUp, normalizePath } from "./path.ts";
