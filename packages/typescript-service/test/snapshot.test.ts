import { equal } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import ts from "typescript";
import { VersionedSnapshot } from "../src/snapshot";

describe("VersionedSnapshot", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
  const sampleSnapshotFileName = path.join(
    fixturePath,
    "sample-snapshot-file.js"
  );

  it("initial version is 1", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);

    equal(snapshot.getVersion(), "1");
  });

  it("snapshot content matches the given file", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    const s = snapshot.getSnapshot();

    equal(
      s.getText(0, s.getLength()),
      fs.readFileSync(sampleSnapshotFileName, "utf8")
    );
  });

  it("updated snapshot has version 2", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    snapshot.update();

    equal(snapshot.getVersion(), "2");
  });

  it("updated snapshot content matches the given string passed to the update call", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    snapshot.update(ts.ScriptSnapshot.fromString("snapshot content abc 123"));
    const s = snapshot.getSnapshot();

    equal(s.getText(0, s.getLength()), "snapshot content abc 123");
  });
});
