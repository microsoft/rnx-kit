import type {
  Dependencies,
  Graph,
  MixedOutput,
} from "@rnx-kit/metro-serializer";

export type Delta = {
  added: Dependencies<MixedOutput>;
  modified: Dependencies<MixedOutput>;
  deleted: Set<string>;
  reset: boolean;
};

export function typescriptSerializerHook(graph: Graph, delta: Delta): void {
  console.log(
    "HOOK: reset=%o, platform=%o",
    delta.reset,
    graph.transformOptions.platform
  );
  delta?.added?.forEach((_module, moduleName) => {
    console.log("  ADD: %o", moduleName);
  });
  delta?.modified?.forEach((_module, moduleName) => {
    console.log("  MOD: %o", moduleName);
  });
  delta?.deleted?.forEach((moduleName) => {
    console.log("  DEL: %o", moduleName);
  });
}
