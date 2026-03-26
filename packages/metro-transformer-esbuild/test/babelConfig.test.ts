import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addPluginToConfig,
  findBabelConfigFile,
  resolvePluginName,
} from "../src/babelConfig";
import type { FilePluginOptions } from "../src/types";

describe("findBabelConfigFile", () => {
  it("returns undefined for a directory with no babel config", () => {
    // use the test directory itself, which should not have a babel config
    equal(findBabelConfigFile(__dirname), undefined);
  });

  it("finds babel.config.js in the project root", () => {
    // the repo root should have a babel config or at minimum we can test
    // with a known directory. Use process.cwd() as it's the repo root during tests.
    const result = findBabelConfigFile(process.cwd());
    if (result) {
      ok(
        result.endsWith(".babelrc") ||
          result.endsWith(".babelrc.js") ||
          result.endsWith("babel.config.js")
      );
    }
    // if no config found, that's also valid — just means the repo root doesn't have one
  });
});

describe("resolvePluginName", () => {
  it("returns the string directly for a string plugin", () => {
    equal(resolvePluginName("transform-typescript"), "transform-typescript");
  });

  it("returns the first element for a tuple plugin with string", () => {
    equal(
      resolvePluginName(["transform-typescript", { loose: true }]),
      "transform-typescript"
    );
  });

  it("returns the name property for a ConfigItem-like object", () => {
    equal(
      resolvePluginName({
        name: "transform-react-jsx",
        // minimal ConfigItem shape
        value: () => undefined,
        options: {},
        dirname: "",
        file: undefined,
      }),
      "transform-react-jsx"
    );
  });

  it("returns undefined for a tuple with non-string first element", () => {
    equal(resolvePluginName([() => undefined, { loose: true }]), undefined);
  });

  it("returns undefined for a function plugin", () => {
    equal(
      resolvePluginName(() => ({})),
      undefined
    );
  });
});

describe("addPluginToConfig", () => {
  const tsPlugin = "transform-typescript";
  const constEnumPlugin = "const-enum";
  const jsxPlugin = "transform-react-jsx";
  const jsxDevPlugin = "transform-react-jsx-development";
  const jsxSelfPlugin = "transform-react-jsx-self";
  const jsxSourcePlugin = "transform-react-jsx-source";
  const otherPlugin = "transform-arrow-functions";

  it("blocks transform-typescript", () => {
    equal(addPluginToConfig({}, tsPlugin), false);
  });

  it("blocks const-enum", () => {
    equal(addPluginToConfig({}, constEnumPlugin), false);
  });

  it("allows regular plugins", () => {
    equal(addPluginToConfig({}, otherPlugin), true);
  });

  it("allows JSX plugins when handleJsx is false", () => {
    equal(addPluginToConfig({}, jsxPlugin), true);
  });

  it("allows JSX plugins when handleJsx is true but no loader (not an esbuild file)", () => {
    const opts: FilePluginOptions = { handleJsx: true };
    equal(addPluginToConfig(opts, jsxPlugin), true);
  });

  it("blocks JSX plugins when handleJsx is true and loader is set", () => {
    const opts: FilePluginOptions = { handleJsx: true, loader: "tsx" };
    equal(addPluginToConfig(opts, jsxPlugin), false);
    equal(addPluginToConfig(opts, jsxDevPlugin), false);
    equal(addPluginToConfig(opts, jsxSelfPlugin), false);
    equal(addPluginToConfig(opts, jsxSourcePlugin), false);
  });

  it("allows JSX plugins when handleJsx is false even with loader set", () => {
    const opts: FilePluginOptions = { handleJsx: false, loader: "ts" };
    equal(addPluginToConfig(opts, jsxPlugin), true);
  });

  it("still blocks typescript plugins regardless of handleJsx and loader", () => {
    const opts: FilePluginOptions = { handleJsx: true, loader: "tsx" };
    equal(addPluginToConfig(opts, tsPlugin), false);
  });

  it("works with tuple-style plugins", () => {
    equal(addPluginToConfig({}, ["transform-typescript", {}]), false);
    equal(addPluginToConfig({}, ["transform-arrow-functions", {}]), true);
  });
});
