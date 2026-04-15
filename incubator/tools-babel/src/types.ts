import type { PluginItem, TransformOptions } from "@babel/core";
import type { BabelTransformerArgs as MetroTransformerArgs } from "metro-babel-transformer";

/**
 * Define the options type for metro babel transformers. Internally the default transformer checks
 * options.hot to determine whether to include the hot module replacement plugin but it is missing
 * from the types.
 */
export type BabelTransformerOptions = MetroTransformerArgs["options"] & {
  hot?: boolean;
};

/**
 * Redeclare the transformer args type to include the typed plugins field and the adjusted options type.
 */
export type BabelTransformerArgs = {
  readonly filename: string;
  readonly options: BabelTransformerOptions;
  readonly plugins?: PluginItem[];
  readonly src: string;
};

/**
 * Modified transformer args, this can be passed to something that expects the original args, but while within
 * internal routines this allows the same args object to be used and mutated in place to avoid unnecessary copying
 * and object creation.
 */
export type TransformerArgs<T extends TransformerContext = TransformerContext> =
  {
    /** Filename of the source file being transformed */
    readonly filename: string;

    /** Metro's babel transformer options */
    readonly options: BabelTransformerOptions;

    /** Babel config, will already have the plugins applied */
    config: TransformOptions;

    /** current value for src, may have been modified during the transformation process */
    src: string;

    /** info and state about the file being transformed */
    context: T;
  };

/**
 * The context for a given transformation pass, combination of file specific information and broader settings
 */
export type TransformerContext = FileContext & TransformerSettings;

export type SrcSyntax = "js" | "jsx" | "ts" | "tsx";

/**
 * Information about a file that is being transformed, these options may be mutated as transformation
 * progresses to reflect changes to the source or to track state about the file.
 */
export type FileContext = {
  /** file extension, lower case */
  ext: string;

  /** syntax type of the source file */
  srcSyntax: SrcSyntax;

  /** if a native tool has modified source, a map in serialized JSON format can be added */
  map?: string;

  /** May contain flow syntax */
  mayContainFlow: boolean;

  /** Is this file under node_modules */
  isNodeModule: boolean;
};

/**
 * Settings that persist being transformation passes and are not specific to a single file.
 */
export type TransformerSettings = {
  /** values to add to the babel config's caller structure */
  configCallerMixins?: Record<string, string>;

  /** key values for plugins that should be disabled in the config */
  configDisabledPlugins?: Set<string>;

  /** disable the oxc parser */
  disableOxcParser?: boolean;

  /** disable the hermes parser */
  disableHermesParser?: boolean;

  /** Starting flow code state for .js(x) files */
  parseFlowDefault?: boolean;

  /** whether this workspace uses flow */
  parseFlowWorkspace?: boolean;

  /** Extension for unknown file types, if unset will return a null ast */
  parseExtDefault?: SrcSyntax;

  /** Syntax aliases, e.g. { ".svg": "jsx" } to treat svg as jsx files */
  parseExtAliases?: Record<string, SrcSyntax>;
};

/**
 * Signature for a trace function that will record information about a call and its duration. This is overloaded to
 * support both sync and async functions and will forward the trailing args to the function being measured.
 * This allows use with and without closures, e.g. both of these work:
 *  trace("myFunction", () => myFunction(arg1, arg2));
 *  trace("myFunction", myFunction, arg1, arg2);
 */
export type TraceFunction = {
  // oxlint-disable-next-line typescript/no-explicit-any
  <TFunc extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
  // oxlint-disable-next-line typescript/no-explicit-any
  <TFunc extends (...args: any[]) => any>(
    name: string,
    fn: TFunc,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
};

/**
 * Types for hermes parser, defined here as they are in flow types in the hermes-parser package
 */
export type HermesParserOptions = {
  allowReturnOutsideFunction?: boolean;
  babel?: boolean;
  flow?: "all" | "detect";
  enableExperimentalComponentSyntax?: boolean;
  enableExperimentalFlowMatchSyntax?: boolean;
  enableExperimentalFlowRecordSyntax?: boolean;
  reactRuntimeTarget?: "18" | "19";
  sourceFilename?: string;
  sourceType?: "module" | "script" | "unambiguous";
  tokens?: boolean;
  transformOptions?: {
    TransformEnumSyntax?: {
      enable: boolean;
      getRuntime?: () => unknown;
    };
  };
};
