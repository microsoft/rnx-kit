import ts from "typescript";
import { VersionedSnapshot } from "./snapshot";

export class ProjectFileCache {
  private files: Map<string, VersionedSnapshot> = new Map();

  constructor(fileNames: string[]) {
    fileNames.forEach((fileName) => this.add(fileName));
  }

  add(fileName: string) {
    this.files.set(fileName, new VersionedSnapshot(fileName));
  }

  update(fileName: string, snapshot?: ts.IScriptSnapshot) {
    if (!this.files.has(fileName)) {
      throw new Error(`Cannot update unknown project file ${fileName}`);
    }
    this.files.get(fileName)!.update(snapshot);
  }

  delete(fileName: string) {
    this.files.delete(fileName);
  }

  getFileNames(): string[] {
    return Array.from(this.files.keys());
  }

  getVersion(fileName: string): string | undefined {
    return this.files.get(fileName)?.getVersion();
  }

  getSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    return this.files.get(fileName)?.getSnapshot();
  }
}

// TODO: the files in this list need to be watched. on change/delete, remove from this list and let the file be re-cached on demand
export class ExternalFileCache {
  private files: Map<string, VersionedSnapshot> = new Map();

  getSnapshot(fileName: string): ts.IScriptSnapshot {
    if (!this.files.has(fileName)) {
      this.files.set(fileName, new VersionedSnapshot(fileName));
    }

    return this.files.get(fileName)!.getSnapshot();
  }
}
