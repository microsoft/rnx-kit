import ts from "typescript";
import { sanitizeOptions } from "../src/tsoptions";

describe("sanitizeOptions", () => {
  it("should convert target option correctly", () => {
    const options = sanitizeOptions({
      target: "es6",
    } as unknown as ts.CompilerOptions);
    expect(options).toEqual({ target: ts.ScriptTarget.ES2015 });
  });

  it("can handle uppercase target option", () => {
    const options = sanitizeOptions({
      target: "ES6",
    } as unknown as ts.CompilerOptions);
    expect(options).toEqual({ target: ts.ScriptTarget.ES2015 });
  });

  it("should convert module option correctly", () => {
    const options = sanitizeOptions({
      module: "commonJs",
    } as unknown as ts.CompilerOptions);
    expect(options).toEqual({ module: ts.ModuleKind.CommonJS });
  });
});
