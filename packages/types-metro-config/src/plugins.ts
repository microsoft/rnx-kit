import type { MixedOutput } from "metro";
import type { SerializerHookPlugin, SerializerPlugin } from "./serializer";
import type { TransformerPlugin } from "./transformer.ts";

export type PluginType = "serializer" | "serializerHook" | "transformer";
export type PrintMessage = (message: string) => void;

/**
 * Serializer plugin factory type, should be the default export of the serializer plugin package
 */
export type SerializerPluginFactory<
  TOptions extends object = Record<string, unknown>,
  T = MixedOutput,
> = {
  (options?: TOptions, print?: PrintMessage): SerializerPlugin<T>;
  type?: "serializer";
};

/**
 * Serializer hook plugin factory type, should be the default export of the serializer hook plugin package
 */
export type SerializerHookPluginFactory<
  TOptions extends object = Record<string, unknown>,
  T = MixedOutput,
> = {
  (options?: TOptions, print?: PrintMessage): SerializerHookPlugin<T>;
  type: "serializerHook";
};

/**
 * Transformer plugin type, should be the default export of the transformer plugin package
 */
export type TransformerPluginFactory<
  TOptions extends object = Record<string, unknown>,
> = {
  (options?: TOptions, print?: PrintMessage): TransformerPlugin;
  type: "transformer";
};
