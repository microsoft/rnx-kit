import {
  parseCommandLineRnTs,
  parseCommandLineTs,
  parseCommandLine,
} from "../../src/command-line/parse";

function getRnArgs(): string[] {
  return [
    "--platform",
    "ios",
    "--platformExtensions",
    "mobile,native",
    "--disableReactNativePackageSubstitution",
  ];
}

function getTsArgs(): string[] {
  return ["node", "rn-tsc.js", "a.ts", "--declaration"];
}

describe("Parse > parseCommandLineRnTs", () => {
  test("extracts --platform value", () => {
    const result = parseCommandLineRnTs(getRnArgs());
    expect(result.tsArgs.indexOf("--platform")).toEqual(-1);
    expect(result.cmdLineRnTs.platform).toEqual("ios");
  });

  test("extracts --platformExtensions value", () => {
    const result = parseCommandLineRnTs(getRnArgs());
    expect(result.tsArgs.indexOf("--platformExtensions")).toEqual(-1);
    expect(result.cmdLineRnTs.platformExtensions).toIncludeSameMembers([
      "native",
      "mobile",
    ]);
  });

  test("throws when --platformExtensions is given without --platform", () => {
    expect(() =>
      parseCommandLineRnTs(["--platformExtensions", "native"])
    ).toThrowError();
  });

  test("extracts --disableReactNativePackageSubstitution flag", () => {
    const result = parseCommandLineRnTs(getRnArgs());
    expect(
      result.tsArgs.indexOf("--disableReactNativePackageSubstitution")
    ).toEqual(-1);
    expect(result.cmdLineRnTs.disableReactNativePackageSubstitution).toBeTrue();
  });

  test("throws when --disableReactNativePackageSubstitution is given without --platform", () => {
    expect(() =>
      parseCommandLineRnTs(["--disableReactNativePackageSubstitution"])
    ).toThrowError();
  });
});

describe("Parse > parseCommandLineTs", () => {
  test("throws when unsupport parameter --build is the first parameter", () => {
    expect(() =>
      parseCommandLineTs(["node", "rn-tsc.js", "--build"])
    ).toThrowError();
  });

  test("throws when unsupport parameter -b is the first parameter", () => {
    expect(() =>
      parseCommandLineTs(["node", "rn-tsc.js", "-b"])
    ).toThrowError();
  });

  test("returns a parsed command line", () => {
    const cmdLineTs = parseCommandLineTs(getTsArgs());
    expect(cmdLineTs.fileNames).toIncludeSameMembers(["a.ts"]);
    expect(cmdLineTs.options.declaration).toBeTrue();
  });
});

describe("Parse > parseCommandLine", () => {
  test("returns a parsed command line", () => {
    const cmdLine = parseCommandLine([...getTsArgs(), ...getRnArgs()]);
    expect(cmdLine.rnts).toBeObject();
    expect(cmdLine.ts).toBeObject();
  });
});
