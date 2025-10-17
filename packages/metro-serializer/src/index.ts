import {
  getMetroVersion as getMetroVersionInternal,
  requireModuleFromMetro,
} from "@rnx-kit/tools-react-native/metro";
import type {
  MixedOutput,
  Module,
  ReadOnlyGraph,
  SerializerOptions,
} from "metro";

export type MetroPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: readonly Module<T>[],
  graph: ReadOnlyGraph<T>,
  options: SerializerOptions<T>
) => void;

export type Bundle = {
  modules: readonly [number, string][];
  post: string;
  pre: string;
};

export type CustomSerializerResult = string | { code: string; map: string };

export type CustomSerializer = (
  entryPoint: string,
  preModules: readonly Module[],
  graph: ReadOnlyGraph,
  options: SerializerOptions
) => Promise<CustomSerializerResult> | CustomSerializerResult;

export type TestMocks = {
  baseJSBundle?: (
    entryPoint: string,
    preModules: readonly Module[],
    graph: ReadOnlyGraph,
    options: SerializerOptions
  ) => Bundle;
  bundleToString?: (bundle: Bundle) => CustomSerializerResult;
};

function getMetroVersion(): number {
  const version = getMetroVersionInternal();
  if (!version) {
    // If Metro cannot be found, assume we're running a recent version
    return Number.MAX_SAFE_INTEGER;
  }

  const [major, minor = 0, patch = 0] = version.split(".");
  return Number(major) * 1_000_000 + Number(minor) * 1_000 + Number(patch);
}

/**
 * Metro's default bundle serializer.
 *
 * Note that the return type changed to a `Promise` in
 * [0.60](https://github.com/facebook/metro/commit/d6b9685c730d0d63577db40f41369157f28dfa3a).
 *
 * @see https://github.com/facebook/metro/blob/af23a1b27bcaaff2e43cb795744b003e145e78dd/packages/metro/src/Server.js#L228
 */
export function MetroSerializer(
  plugins: MetroPlugin[],
  __mocks: TestMocks = {}
): CustomSerializer {
  const baseJSBundle =
    __mocks.baseJSBundle ??
    requireModuleFromMetro("metro/src/DeltaBundler/Serializers/baseJSBundle");
  const bundleToString =
    __mocks.bundleToString ??
    requireModuleFromMetro("metro/src/lib/bundleToString");

  const shouldReturnPromise = getMetroVersion() >= 60000;

  return (
    entryPoint: string,
    preModules: readonly Module[],
    graph: ReadOnlyGraph,
    options: SerializerOptions
  ): string | Promise<string> => {
    for (const plugin of plugins) {
      plugin(entryPoint, preModules, graph, options);
    }

    const bundle = baseJSBundle(entryPoint, preModules, graph, options);
    const bundleResult = bundleToString(bundle);
    const bundleCode =
      typeof bundleResult === "string" ? bundleResult : bundleResult.code;
    return shouldReturnPromise ? Promise.resolve(bundleCode) : bundleCode;
  };
}
