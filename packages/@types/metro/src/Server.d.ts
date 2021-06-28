import type { AssetData, BundleOptions } from "metro";
import type {
  CustomTransformOptions,
  TransformProfile,
} from "metro-babel-transformer";
import type { ConfigT } from "metro-config";

export type ServerOptions = Readonly<{
  hasReducedPerformance?: boolean;
  onBundleBuilt?: (bundlePath: string) => void;
  watch?: boolean;
}>;

type DefaultGraphOptions = {
  customTransformOptions: CustomTransformOptions;
  dev: boolean;
  hot: boolean;
  minify: boolean;
  runtimeBytecodeVersion?: number;
  unstable_transformProfile: TransformProfile;
};

type DefaultBundleOptions = DefaultGraphOptions & {
  excludeSource: boolean;
  inlineSourceMap: boolean;
  modulesOnly: boolean;
  onProgress: () => void;
  runModule: boolean;
  shallow: boolean;
  sourceMapUrl: string;
  sourceUrl: string;
};

export default class Server {
  constructor(config: ConfigT, options?: ServerOptions);
  getAssets(options: BundleOptions): Promise<ReadonlyArray<AssetData>>;
  end(): void;

  static DEFAULT_GRAPH_OPTIONS: DefaultGraphOptions;
  static DEFAULT_BUNDLE_OPTIONS: DefaultBundleOptions;
}
