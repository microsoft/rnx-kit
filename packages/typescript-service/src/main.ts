import * as ts from "typescript";
import { Service } from "./service";

// TODO: add documentation (README.md)
// TODO: remove this file and hook it from index.ts
export function main() {
  const service = new Service();

  const projectReference = service.openProject("./");
  if (!projectReference) {
    return;
  }
  const project = projectReference;
  project.warmup();

  const f = project.getConfig().fileNames[0];

  // typecheck this file -- will succeed
  console.log("validating file: %o", f);
  project.validateFile(f);

  // replace this file with some questionable code to generate errors
  console.log("re-loading file: %o", f);
  project.updateFile(
    f,
    ts.ScriptSnapshot.fromString("function foo(x: any) { return 1; }")
  );

  // typecheck again -- will fail
  console.log("validating file: %o", f);
  project.validateFile(f);

  console.log("removing file: %o", f);
  project.removeFile(f);

  console.log("re-adding file: %o", f);
  project.addFile(f);

  console.log("re-validating file: %o", f);
  project.validateFile(f);

  project.dispose();
}
