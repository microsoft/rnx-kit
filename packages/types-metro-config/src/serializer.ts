import type {
  MixedOutput,
  Module,
  ReadOnlyGraph,
  SerializerOptions,
} from "metro";

// ---------------------------------------------------------------------------
// Serializer plugin types
// ---------------------------------------------------------------------------

/**
 * A Metro serializer plugin. Called once per bundle with the full module graph
 * before serialization. Use this to inspect or validate the bundle contents.
 */
export type SerializerPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: readonly Module<T>[],
  graph: ReadOnlyGraph<T>,
  options: SerializerOptions<T>,
) => void;

/**
 * Intermediate bundle representation produced by Metro's baseJSBundle.
 */
export type Bundle = {
  modules: readonly [number, string][];
  post: string;
  pre: string;
};

/**
 * The value returned by a Metro custom serializer — either a raw code string
 * or an object with separate code and source-map strings.
 */
export type CustomSerializerResult = string | { code: string; map: string };

/**
 * Signature of a Metro custom serializer, as set on
 * `serializer.customSerializer` in the Metro config.
 */
export type CustomSerializer = (
  entryPoint: string,
  preModules: readonly Module[],
  graph: ReadOnlyGraph,
  options: SerializerOptions,
) => Promise<CustomSerializerResult> | CustomSerializerResult;
