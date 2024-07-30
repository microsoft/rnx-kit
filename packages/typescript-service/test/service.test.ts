import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import type ts from "typescript";
import { Project } from "../src/project";
import { Service } from "../src/service";

describe("Service.openProject()", () => {
  it("returns a valid object", () => {
    const service = new Service();
    const config = { fileNames: [] } as unknown as ts.ParsedCommandLine;
    const project = service.openProject(config);

    ok(project instanceof Project);
  });
});
