export type MixedOutput = {
  data: unknown;
  type: string;
};

export type TransformResultDependency = {
  /**
   * The literal name provided to a require or import call. For example 'foo' in
   * case of `require('foo')`.
   */
  name: string;
};

export type BundleCodeWithSourceMap = {
  code: string;
  map: string;
};

export type BundleCode = string | BundleCodeWithSourceMap;

export type Dependency = {
  absolutePath: string;
  data: TransformResultDependency;
  [key: string]: unknown;
};

export type Dependencies<T = MixedOutput> = Map<string, Module<T>>;

export type CustomTransformOptions = {
  [key: string]: unknown;
  __proto__: null;
};

export type TransformTargetType = "script" | "module" | "asset";

export type TransformProfile = "default" | "hermes-stable" | "hermes-canary";

export type TransformOptions = Readonly<{
  customTransformOptions?: CustomTransformOptions;
  dev: boolean;
  experimentalImportSupport?: boolean;
  hot: boolean;
  inlinePlatform: boolean;
  inlineRequires: boolean;
  minify: boolean;
  nonInlinedRequires?: ReadonlyArray<string>;
  platform?: string;
  runtimeBytecodeVersion?: number;
  type: TransformTargetType;
  unstable_disableES6Transforms?: boolean;
  unstable_transformProfile: TransformProfile;
}>;

export type TransformInputOptions = Omit<
  TransformOptions,
  "inlinePlatform" | "inlineRequires"
>;

export type Graph<T = MixedOutput> = {
  dependencies: Dependencies<T>;
  importBundleNames: Set<string>;
  entryPoints: ReadonlyArray<string>;
  transformOptions: TransformInputOptions;
};

export type Module<T = MixedOutput> = {
  dependencies: Map<string, Dependency>;
  inverseDependencies: Set<string>;
  output: ReadonlyArray<T>;
  path: string;
  getSource: () => Buffer;
};

export type SerializerOptions<T = MixedOutput> = {
  asyncRequireModulePath: string;
  createModuleId: (filePath: string) => number;
  dev: boolean;
  getRunModuleStatement: (moduleId: string | number) => string;
  inlineSourceMap?: boolean;
  modulesOnly: boolean;
  processModuleFilter: (module: Module<T>) => boolean;
  projectRoot: string;
  runBeforeMainModule: ReadonlyArray<string>;
  runModule: boolean;
  sourceMapUrl?: string;
  sourceUrl?: string;
};

export type MetroPlugin<T = MixedOutput> = (
  entryPoint: string,
  preModules: ReadonlyArray<Module<T>>,
  graph: Graph<T>,
  options: SerializerOptions<T>
) => void;

/**
 * Note that the return type changed to a `Promise` in
 * [0.60](https://github.com/facebook/metro/commit/d6b9685c730d0d63577db40f41369157f28dfa3a).
 */
export type Serializer<T = MixedOutput> = (
  entryPoint: string,
  preModules: ReadonlyArray<Module<T>>,
  graph: Graph<T>,
  options: SerializerOptions<T>
) => BundleCode | Promise<BundleCode>;
