import { lazyInit } from "@rnx-kit/reporter";

export function toArray<T>(item: T | T[] | undefined | null): T[] {
  if (item == null) {
    return [];
  }
  return Array.isArray(item) ? item : [item];
}

/**
 * Wrapper around optional peer dependencies. It avoids the need for try/catch around require calls and provides
 * a way to check if the module is available before trying to use it.
 * The module is loaded lazily, so it won't be required until it's actually used.
 * @param moduleName
 * @returns
 */
export function optionalModule<T>(moduleName: string) {
  const available = lazyInit<boolean>(() => {
    try {
      require.resolve(moduleName);
      return true;
    } catch {
      console.warn(
        `Optional module ${moduleName} not found, add as a devDependency to enable usage.`
      );
      return false;
    }
  });
  const get = lazyInit<T>(() => require(moduleName) as T);
  return { available, get };
}
