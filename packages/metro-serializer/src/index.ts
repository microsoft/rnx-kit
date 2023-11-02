import { findMetroPath } from "@rnx-kit/tools-react-native/metro";
import type {
  MixedOutput,
  Module,
  ReadOnlyGraph,
  SerializerOptions,
} from "metro";
import * as semver from "semver";

export type MetroPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: readonly Module<T>[],
  graph: ReadOnlyGraph<T>,
  options: SerializerOptions<T>
) => void;

export type CustomSerializerResult = string | { code: string; map: string };

export type CustomSerializer = (
  entryPoint: string,
  preModules: readonly Module[],
  graph: ReadOnlyGraph,
  options: SerializerOptions
) => Promise<CustomSerializerResult> | CustomSerializerResult;

/**
 * Metro's default bundle serializer.
 *
 * Note that the return type changed to a `Promise` in
 * [0.60](https://github.com/facebook/metro/commit/d6b9685c730d0d63577db40f41369157f28dfa3a).
 *
 * @see https://github.com/facebook/metro/blob/af23a1b27bcaaff2e43cb795744b003e145e78dd/packages/metro/src/Server.js#L228
 */
export function MetroSerializer(plugins: MetroPlugin[]): CustomSerializer {
  const metroPath = findMetroPath() || "metro";
  const baseJSBundle = require(
    `${metroPath}/src/DeltaBundler/Serializers/baseJSBundle`
  );
  const bundleToString = require(`${metroPath}/src/lib/bundleToString`);

  const { version } = require(`${metroPath}/package.json`);
  const shouldReturnPromise = semver.satisfies(version, ">=0.60.0");

  return (
    entryPoint: string,
    preModules: readonly Module[],
    graph: ReadOnlyGraph,
    options: SerializerOptions
  ): string | Promise<string> => {
    plugins.forEach((plugin) => plugin(entryPoint, preModules, graph, options));
    const bundle = baseJSBundle(entryPoint, preModules, graph, options);
    const bundleCode = bundleToString(bundle).code;
    return shouldReturnPromise ? Promise.resolve(bundleCode) : bundleCode;
  };
}
