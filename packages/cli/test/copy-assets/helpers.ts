// istanbul ignore file

import * as fs from "fs-extra";

export function findFiles() {
  // @ts-ignore `__toJSON`
  return Object.entries(fs.__toJSON());
}

export function mockFiles(files: Record<string, string> = {}) {
  // @ts-ignore `__setMockFiles`
  fs.__setMockFiles(files);
}
