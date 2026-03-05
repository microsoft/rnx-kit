import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { SerializerEsbuildConfig } from "@rnx-kit/types-metro-serializer-esbuild";
import type { TransformerConfigT } from "metro-config";
import { MetroSerializer } from "./serializer";
import { configureTransformer } from "./transformer";

/**
 * Create factory functions for creating a Metro serializer and transformer configured to work together using esbuild.
 * @param config shared configuration options for the serializer and transformer
 * @returns factory functions for creating the serializer and transformer
 */
export function MetroEsbuildFactory(config: SerializerEsbuildConfig = {}) {
  // serializer factory function
  const serializerOptions = getSerializerOptions(config);
  function makeSerializer(plugins: MetroPlugin[] = []) {
    return MetroSerializer(plugins, serializerOptions);
  }

  // transformer configuration, right now this is simple but it will get more complex when esbuild transformation is added
  function makeTransformer(userOptions?: Partial<TransformerConfigT>) {
    return configureTransformer(config, userOptions);
  }

  return { makeSerializer, makeTransformer };
}

function getSerializerOptions(
  config: SerializerEsbuildConfig
): SerializerEsbuildConfig {
  const { minifyStrategy = "serializer", ...buildOptions } = config;
  // if esbuild should not minify, then disable all minification options
  if (minifyStrategy !== "serializer") {
    buildOptions.minify = false;
    buildOptions.minifyWhitespace = false;
    buildOptions.minifyIdentifiers = false;
    buildOptions.minifySyntax = false;
  }
  return buildOptions;
}
