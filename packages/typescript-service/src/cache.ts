import { normalizePath } from "@rnx-kit/tools-node";
import * as nodefs from "fs";
import type ts from "typescript";
import { VersionedSnapshot } from "./snapshot";

export class ProjectFileCache {
  private files = new Map<string, VersionedSnapshot>();
  private filesystem: typeof nodefs;

  constructor(fileNames: string[], fs = nodefs) {
    this.filesystem = fs;
    fileNames.forEach((fileName) => this.set(fileName));
  }

  has(fileName: string): boolean {
    const normalized = normalizePath(fileName);
    return this.files.has(normalized);
  }

  set(fileName: string, snapshot?: ts.IScriptSnapshot): void {
    const normalized = normalizePath(fileName);
    const file = this.files.get(normalized);
    if (!file) {
      this.files.set(
        normalized,
        new VersionedSnapshot(normalized, snapshot, this.filesystem)
      );
    } else {
      file.update(snapshot);
    }
  }

  remove(fileName: string): void {
    const normalized = normalizePath(fileName);
    this.files.delete(normalized);
  }

  removeAll(): void {
    this.files.clear();
  }

  getFileNames(): string[] {
    return Array.from(this.files.keys());
  }

  getVersion(fileName: string): string | undefined {
    const normalized = normalizePath(fileName);
    return this.files.get(normalized)?.getVersion();
  }

  getSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const normalized = normalizePath(fileName);
    return this.files.get(normalized)?.getSnapshot();
  }
}

// TODO: the files in this list need to be watched. on change/delete, remove from this list and let the file be re-cached on demand
export class ExternalFileCache {
  private files = new Map<string, VersionedSnapshot>();
  private filesystem: typeof nodefs;

  constructor(fs = nodefs) {
    this.filesystem = fs;
  }

  getSnapshot(fileName: string): ts.IScriptSnapshot {
    const normalized = normalizePath(fileName);

    let file = this.files.get(normalized);
    if (!file) {
      file = new VersionedSnapshot(normalized, undefined, this.filesystem);
      this.files.set(normalized, file);
    }

    return file.getSnapshot();
  }
}
