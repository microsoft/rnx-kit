import "jest-extended";
import ts from "typescript";
import { hasExtension, getExtensionFromPath } from "../src/extension";

describe("Extension > hasExtension", () => {
  test("returns true when the file has the given extension", () => {
    expect(hasExtension("foo.d.ts", ts.Extension.Dts)).toBeTrue();
  });

  test("returns false when the file does not have the given extension", () => {
    expect(hasExtension("foo.d.ts", ts.Extension.Js)).toBeFalse();
  });
});

describe("Extension > getExtensionFromPath", () => {
  test("finds .d.ts extension", () => {
    expect(getExtensionFromPath("foo.d.ts")).toEqual(ts.Extension.Dts);
  });

  test("finds .ts extension", () => {
    expect(getExtensionFromPath("foo.ts")).toEqual(ts.Extension.Ts);
  });

  test("finds .jsx extension", () => {
    expect(getExtensionFromPath("foo.jsx")).toEqual(ts.Extension.Jsx);
  });

  test("does not find an extension when the file has no extension", () => {
    expect(getExtensionFromPath("foo")).toBeUndefined();
  });

  test("does not find an extension when the file extension is unrecognized", () => {
    expect(getExtensionFromPath("foo.txt")).toBeUndefined();
  });
});
