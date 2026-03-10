import type { SerializerPlugin } from "./serializer";
import type { TransformerPlugin } from "./transformer.ts";
import type { MixedOutput } from "metro";

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
  type?: "serializer" | "serializerHook";
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
