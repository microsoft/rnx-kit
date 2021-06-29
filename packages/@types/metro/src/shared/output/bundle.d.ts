import type { OutputOptions, RequestOptions, Server } from "metro";

export function build(
  packagerClient: Server,
  requestOptions: RequestOptions
): Promise<{
  code: string;
  map: string;
}>;

export function save(
  bundle: {
    code: string;
    map: string;
  },
  options: OutputOptions,
  log: (...args: Array<string>) => void
): Promise<unknown>;
