import { normalizePath } from "@rnx-kit/tools-node";
import ts from "typescript";
import { VersionedSnapshot } from "./snapshot";

export class ProjectFileCache {
  private files: Map<string, VersionedSnapshot> = new Map();

  constructor(fileNames: string[]) {
    fileNames.forEach((fileName) => this.set(fileName));
  }

  has(fileName: string): boolean {
    const normalized = normalizePath(fileName);
    return this.files.has(normalized);
  }

  set(fileName: string, snapshot?: ts.IScriptSnapshot): void {
    const normalized = normalizePath(fileName);
    if (!this.files.has(normalized)) {
      this.files.set(normalized, new VersionedSnapshot(normalized, snapshot));
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Map has the element, and we only store non-null objects
      this.files.get(normalized)!.update(snapshot);
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
  private files: Map<string, VersionedSnapshot> = new Map();

  getSnapshot(fileName: string): ts.IScriptSnapshot {
    const normalized = normalizePath(fileName);

    let file = this.files.get(normalized);
    if (!file) {
      file = new VersionedSnapshot(normalized);
      this.files.set(normalized, file);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Map has the element, and we only store non-null objects
    return this.files.get(normalized)!.getSnapshot();
  }
}
