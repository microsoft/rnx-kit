import path from "path";
import fs from "fs";
import ts from "typescript";
import { VersionedSnapshot } from "../src/snapshot";

describe("VersionedSnapshot", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
  const sampleSnapshotFileName = path.join(
    fixturePath,
    "sample-snapshot-file.js"
  );

  test("initial version is 1", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    expect(snapshot.getVersion()).toEqual("1");
  });

  test("snapshot content matches the given file", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    const s = snapshot.getSnapshot();
    expect(s.getText(0, s.getLength())).toEqual(
      fs.readFileSync(sampleSnapshotFileName, "utf8")
    );
  });

  test("updated snapshot has version 2", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    snapshot.update();
    expect(snapshot.getVersion()).toEqual("2");
  });

  test("updated snapshot content matches the given string passed to the update call", () => {
    const snapshot = new VersionedSnapshot(sampleSnapshotFileName);
    snapshot.update(ts.ScriptSnapshot.fromString("snapshot content abc 123"));
    const s = snapshot.getSnapshot();
    expect(s.getText(0, s.getLength())).toEqual("snapshot content abc 123");
  });
});
