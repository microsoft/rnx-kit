import type { SourceLocation } from "@babel/code-frame";

export type MixedOutput = {
  readonly data: { code: string };
  readonly type: string;
};

export type AsyncDependencyType = "async" | "prefetch";

export type TransformResultDependency = {
  /**
   * The literal name provided to a require or import call. For example 'foo' in
   * case of `require('foo')`.
   */
  readonly name: string;

  readonly data: {
    /**
     * If not null, this dependency is due to a dynamic `import()` or `__prefetchImport()` call.
     */
    readonly asyncType: AsyncDependencyType | null;

    /**
     * The condition for splitting on this dependency edge.
     */
    readonly splitCondition?: {
      readonly mobileConfigName: string;
    };

    /**
     * The dependency is enclosed in a try/catch block.
     */
    readonly isOptional?: boolean;

    readonly locs: ReadonlyArray<SourceLocation>;
  };
};

export type Dependency = {
  readonly absolutePath: string;
  readonly data: TransformResultDependency;
  [key: string]: unknown;
};

export type Module<T = MixedOutput> = {
  readonly dependencies: Map<string, Dependency>;
  readonly inverseDependencies: Set<string>;
  readonly output: ReadonlyArray<T>;
  readonly path: string;
  readonly getSource: () => Buffer;
};

export type Dependencies<T = MixedOutput> = Map<string, Module<T>>;

export type Graph<T = MixedOutput> = {
  dependencies: Dependencies<T>;
  importBundleNames: Set<string>;
  readonly entryPoints: ReadonlyArray<string>;
};

export type AllowOptionalDependenciesWithOptions = {
  readonly exclude: Array<string>;
};

export type AllowOptionalDependencies =
  | boolean
  | AllowOptionalDependenciesWithOptions;

export type DeltaResult<T = MixedOutput> = {
  readonly added: Map<string, Module<T>>;
  readonly modified: Map<string, Module<T>>;
  readonly deleted: Set<string>;
  readonly reset: boolean;
};

export type SerializerOptions<T = MixedOutput> = {
  readonly asyncRequireModulePath: string;
  readonly createModuleId: (filePath: string) => number;
  readonly dev: boolean;
  readonly getRunModuleStatement: (moduleId: string | number) => string;
  readonly inlineSourceMap?: boolean;
  readonly modulesOnly: boolean;
  readonly processModuleFilter: (module: Module<T>) => boolean;
  readonly projectRoot: string;
  readonly runBeforeMainModule: ReadonlyArray<string>;
  readonly runModule: boolean;
  readonly sourceMapUrl?: string;
  readonly sourceUrl?: string;
};
