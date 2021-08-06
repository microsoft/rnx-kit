import type { IncomingMessage, ServerResponse } from "http";
import type {
  DeltaResult,
  Graph,
  Module,
  Reporter,
  SerializerOptions,
  Server,
  TransformResult,
  TransformVariants,
} from "metro";
import type { CacheStore, MetroCache } from "metro-cache";
import type { MixedSourceMap } from "metro-source-map";
import type { CustomResolver } from "metro-resolver";
import type { JsTransformerConfig } from "metro-transform-worker";

export type PostProcessBundleSourcemap = (args: {
  code: Buffer | string;
  map: MixedSourceMap;
  outFileName: string;
}) => {
  code: Buffer | string;
  map: MixedSourceMap | string;
};

type ExtraTransformOptions = Partial<{
  readonly preloadedModules: { [path: string]: true } | false;
  readonly ramGroups: Array<string>;
  readonly transform: {
    readonly experimentalImportSupport: boolean;
    readonly inlineRequires: { blockList: { [path: string]: true } } | boolean;
    readonly nonInlinedRequires?: ReadonlyArray<string>;
    readonly unstable_disableES6Transforms?: boolean;
  };
}>;

export type GetTransformOptionsOpts = {
  dev: boolean;
  hot: boolean;
  platform?: string;
};

export type GetTransformOptions = (
  entryPoints: ReadonlyArray<string>,
  options: GetTransformOptionsOpts,
  getDependenciesOf: (filePath: string) => Promise<Array<string>>
) => Promise<ExtraTransformOptions>;

export type Middleware = (
  incomingMessage: IncomingMessage,
  serverResponse: ServerResponse,
  error: (e?: Error) => unknown
) => unknown;

export type ResolverConfigT = {
  assetExts: ReadonlyArray<string>;
  assetResolutions: ReadonlyArray<string>;
  blacklistRE?: RegExp | Array<RegExp>;
  blockList: RegExp | Array<RegExp>;
  dependencyExtractor?: string;
  extraNodeModules: { [name: string]: string };
  hasteImplModulePath?: string;
  nodeModulesPaths: ReadonlyArray<string>;
  platforms: ReadonlyArray<string>;
  resolveRequest?: CustomResolver;
  resolverMainFields: ReadonlyArray<string>;
  sourceExts: ReadonlyArray<string>;
  useWatchman: boolean;
};

export type SerializerConfigT = {
  createModuleIdFactory: () => (path: string) => number;
  customSerializer?: (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ) => Promise<string | { code: string; map: string }>;
  experimentalSerializerHook: (graph: Graph, delta: DeltaResult) => unknown;
  getModulesRunBeforeMainModule: (entryFilePath: string) => Array<string>;
  getPolyfills: (options: { platform?: string }) => ReadonlyArray<string>;
  getRunModuleStatement: (moduleId: number | string) => string;
  polyfillModuleNames: ReadonlyArray<string>;
  postProcessBundleSourcemap: PostProcessBundleSourcemap;
  processModuleFilter: (modules: Module) => boolean;
};

export type TransformerConfigT = JsTransformerConfig & {
  getTransformOptions: GetTransformOptions;
  transformVariants: TransformVariants;
  workerPath: string;
  publicPath: string;
  experimentalImportBundleSupport: boolean;
};

export type MetalConfigT = {
  cacheStores: ReadonlyArray<CacheStore<TransformResult>>;
  cacheVersion: string;
  hasteMapCacheDirectory?: string;
  maxWorkers: number;
  projectRoot: string;
  stickyWorkers: boolean;
  transformerPath: string;
  reporter: Reporter;
  resetCache: boolean;
  watchFolders: ReadonlyArray<string>;
};

export type ServerConfigT = {
  enhanceMiddleware: (middleware: Middleware, server: Server) => Middleware;
  useGlobalHotkey: boolean;
  port: number;
  rewriteRequestUrl: (url: string) => string;
  runInspectorProxy: boolean;
  verifyConnections: boolean;
};

export type SymbolicatorConfigT = {
  customizeFrame: (frame: {
    readonly file?: string;
    readonly lineNumber?: number;
    readonly column?: number;
    readonly methodName?: string;
  }) =>
    | { readonly collapse?: boolean }
    | undefined
    | Promise<{ readonly collapse?: boolean }>
    | Promise<undefined>;
};

export type InputConfigT = MetalConfigT & {
  readonly cacheStores:
    | ReadonlyArray<CacheStore<TransformResult>>
    | ((metroCache: MetroCache) => ReadonlyArray<CacheStore<TransformResult>>);
  readonly resolver: ResolverConfigT;
  readonly server: ServerConfigT;
  readonly serializer: SerializerConfigT;
  readonly symbolicator: SymbolicatorConfigT;
  readonly transformer: TransformerConfigT;
};

export type IntermediateConfigT = MetalConfigT & {
  resolver: ResolverConfigT;
  server: ServerConfigT;
  serializer: SerializerConfigT;
  symbolicator: SymbolicatorConfigT;
  transformer: TransformerConfigT;
};

export type ConfigT = Readonly<MetalConfigT> & {
  readonly resolver: Readonly<ResolverConfigT>;
  readonly server: Readonly<ServerConfigT>;
  readonly serializer: Readonly<SerializerConfigT>;
  readonly symbolicator: Readonly<SymbolicatorConfigT>;
  readonly transformer: Readonly<TransformerConfigT>;
};

export type YargArguments = {
  config?: string;
  cwd?: string;
  port?: string | number;
  host?: string;
  projectRoot?: string;
  watchFolders?: Array<string>;
  assetExts?: Array<string>;
  sourceExts?: Array<string>;
  platforms?: Array<string>;
  "max-workers"?: string | number;
  maxWorkers?: string | number;
  transformer?: string;
  "reset-cache"?: boolean;
  resetCache?: boolean;
  runInspectorProxy?: boolean;
  verbose?: boolean;
};
