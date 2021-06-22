import ts from "typescript";
import { VersionedSnapshot } from "./snapshot";
import { normalizePath } from "./util";

export class ProjectFileCache {
  private files: Map<string, VersionedSnapshot> = new Map();

  constructor(fileNames: string[]) {
    fileNames.forEach((fileName) => this.add(fileName));
  }

  add(fileName: string) {
    const normalized = normalizePath(fileName);
    this.files.set(normalized, new VersionedSnapshot(normalized));
  }

  update(fileName: string, snapshot?: ts.IScriptSnapshot) {
    const normalized = normalizePath(fileName);
    if (!this.files.has(normalized)) {
      throw new Error(`Cannot update unknown project file ${fileName}`);
    }
    this.files.get(normalized)!.update(snapshot);
  }

  delete(fileName: string) {
    const normalized = normalizePath(fileName);
    this.files.delete(normalized);
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
    if (!this.files.has(normalized)) {
      this.files.set(normalized, new VersionedSnapshot(normalized));
    }

    return this.files.get(normalized)!.getSnapshot();
  }
}
