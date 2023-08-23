import type { Format } from "./types";

export type Metafile = {
  inputs: Record<string, Input>;
  outputs: Record<string, Output>;
};

export type Input = {
  bytes: number;
  imports: Import[];
  format?: Format;
};

export type Output = {
  bytes: number;
  inputs: Record<string, InputForOutput>;
  imports: Import[];
  exports: string[];
  entryPoint?: string;
  cssBundle?: string;
};

export type Import = {
  path: string;
  kind: string;
  external?: boolean;
  original?: string;
};

export type InputForOutput = {
  bytesInOutput: number;
};
