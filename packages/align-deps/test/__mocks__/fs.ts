import * as nodefs from "node:fs";

let data = "";

export function __setMockContent(content: unknown, space: string | number = 2) {
  data =
    typeof content === "string"
      ? content
      : JSON.stringify(content, undefined, space) + "\n";
}

export function __setMockFileWriter(writer: typeof nodefs.writeFileSync) {
  writeFileSync = writer;
}

export const existsSync = (...args: Parameters<typeof nodefs.existsSync>) =>
  Boolean(data) || nodefs.existsSync(...args);

export const lstatSync = (...args: Parameters<typeof nodefs.lstatSync>) =>
  nodefs.lstatSync(...args);

export const readFileSync = (...args: Parameters<typeof nodefs.readFileSync>) =>
  data || nodefs.readFileSync(...args);

export const realpathSync = (...args: Parameters<typeof nodefs.realpathSync>) =>
  nodefs.realpathSync(...args);

export const statSync = nodefs.statSync; // used by cosmiconfig

export let writeFileSync = undefined as unknown as typeof nodefs.writeFileSync;
