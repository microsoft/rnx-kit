export type BasicSourceMap = {
  sources: Array<string>;
  sourcesContent: Array<string | null>;
};

export type SourceDiff = {
  state: "added" | "changed" | "removed";
  path: string;
  diff: number;
};

export type BundleDiff = {
  files: SourceDiff[];
  total: number;
};
