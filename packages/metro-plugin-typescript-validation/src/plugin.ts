import type { Dependencies, Graph, MixedOutput } from "metro";

export type Delta = {
  added: Dependencies<MixedOutput>;
  modified: Dependencies<MixedOutput>;
  deleted: Set<string>;
  reset: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function typescriptSerializerHook(_graph: Graph, _delta: Delta): void {}
