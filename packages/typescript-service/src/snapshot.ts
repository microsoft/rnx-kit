import fs from "fs";
import ts from "typescript";

export class VersionedSnapshot {
  fileName: string;
  private version: number;
  private snapshot?: ts.IScriptSnapshot;

  constructor(fileName: string) {
    this.fileName = fileName;
    this.version = 1;
  }

  getVersion(): string {
    return this.version.toString();
  }

  getSnapshot(): ts.IScriptSnapshot {
    if (!this.snapshot) {
      const content = fs.readFileSync(this.fileName, "utf8");
      this.snapshot = ts.ScriptSnapshot.fromString(content);
    }
    return this.snapshot;
  }

  update(snapshot?: ts.IScriptSnapshot) {
    this.version++;
    this.snapshot = snapshot;
  }
}
