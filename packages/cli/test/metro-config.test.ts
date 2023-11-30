import CyclicDependencies from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import DuplicateDependencies from "@rnx-kit/metro-plugin-duplicates-checker";
import type { InputConfigT } from "metro-config";
import { customizeMetroConfig } from "../src/metro-config";

function mockPlugin(moduleName: string) {
  const state: { timesCalled: number; options?: Record<string, unknown> } = {
    timesCalled: 0,
  };

  function PluginMock(options: Record<string, unknown>) {
    state.timesCalled = state.timesCalled + 1;
    state.options = options;
    return () => ({});
  }

  const Plugin = jest.requireActual(moduleName);
  PluginMock.type = Plugin.default.type;
  PluginMock.__context = state;
  PluginMock.mockClear = () => {
    state.timesCalled = 0;
    state.options = undefined;
  };

  return PluginMock;
}

jest.mock("@rnx-kit/metro-plugin-cyclic-dependencies-detector", () => {
  return mockPlugin("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
});

jest.mock("@rnx-kit/metro-plugin-duplicates-checker", () => {
  return mockPlugin("@rnx-kit/metro-plugin-duplicates-checker");
});

// Always use a new mock since `customizeMetroConfig()` modifies the object.
function makeMockConfig(): InputConfigT {
  return {
    serializer: {
      customSerializer: false,
      experimentalSerializerHook: false,
    },
    transformer: {},
  } as unknown as InputConfigT;
}

function toMock(module: unknown): ReturnType<typeof mockPlugin> {
  return module as ReturnType<typeof mockPlugin>;
}

describe("cli/metro-config/customizeMetroConfig", () => {
  afterEach(() => {
    toMock(CyclicDependencies).mockClear();
    toMock(DuplicateDependencies).mockClear();
  });

  test("returns a config with plugins by default", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {});

    expect(inputConfig).toEqual({
      serializer: {
        customSerializer: expect.anything(),
        experimentalSerializerHook: expect.anything(),
      },
      transformer: {},
    });
    expect(typeof inputConfig.serializer.customSerializer).toBe("function");
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({ timesCalled: 1 });
    expect(toMock(DuplicateDependencies).__context).toEqual({ timesCalled: 1 });
  });

  test("returns a config without a custom serializer when there are no plugins", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      plugins: ["@rnx-kit/metro-plugin-typescript"],
    });

    expect(inputConfig).toEqual({
      serializer: {
        experimentalSerializerHook: expect.anything(),
      },
      transformer: {},
    });
    expect(inputConfig.serializer.customSerializer).toBeUndefined();
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({ timesCalled: 0 });
    expect(toMock(DuplicateDependencies).__context).toEqual({ timesCalled: 0 });
  });

  test("returns a config with only duplicates plugin", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      plugins: [
        "@rnx-kit/metro-plugin-duplicates-checker",
        "@rnx-kit/metro-plugin-typescript",
      ],
    });

    expect(inputConfig).toEqual({
      serializer: {
        customSerializer: expect.anything(),
        experimentalSerializerHook: expect.anything(),
      },
      transformer: {},
    });
    expect(typeof inputConfig.serializer.customSerializer).toBe("function");
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({ timesCalled: 0 });
    expect(toMock(DuplicateDependencies).__context).toEqual({ timesCalled: 1 });
  });

  test("returns a config with only cyclic dependencies plugin", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      plugins: [
        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
        "@rnx-kit/metro-plugin-typescript",
      ],
    });

    expect(inputConfig).toEqual({
      serializer: {
        customSerializer: expect.anything(),
        experimentalSerializerHook: expect.anything(),
      },
      transformer: {},
    });
    expect(typeof inputConfig.serializer.customSerializer).toBe("function");
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({ timesCalled: 1 });
    expect(toMock(DuplicateDependencies).__context).toEqual({ timesCalled: 0 });
  });

  test("forwards plugin options", () => {
    const inputConfig = makeMockConfig();
    const cyclicDependenciesOptions = { cyclicDependencies: true };
    const duplicateDependencesOptions = { duplicateDependencies: true };
    customizeMetroConfig(inputConfig, {
      plugins: [
        [
          "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
          cyclicDependenciesOptions,
        ],
        [
          "@rnx-kit/metro-plugin-duplicates-checker",
          duplicateDependencesOptions,
        ],
        "@rnx-kit/metro-plugin-typescript",
      ],
    });

    expect(inputConfig).toEqual({
      serializer: {
        customSerializer: expect.anything(),
        experimentalSerializerHook: expect.anything(),
      },
      transformer: {},
    });
    expect(typeof inputConfig.serializer.customSerializer).toBe("function");
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({
      timesCalled: 1,
      options: cyclicDependenciesOptions,
    });
    expect(toMock(DuplicateDependencies).__context).toEqual({
      timesCalled: 1,
      options: duplicateDependencesOptions,
    });
  });

  test("returns a config with a custom serializer when tree shaking is enabled", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      treeShake: true,
      plugins: ["@rnx-kit/metro-plugin-typescript"],
    });

    expect(inputConfig).toEqual({
      serializer: {
        customSerializer: expect.anything(),
        experimentalSerializerHook: expect.anything(),
      },
      transformer: expect.objectContaining({
        minifierPath: expect.stringContaining("metro-serializer-esbuild"),
      }),
    });
    expect(typeof inputConfig.serializer.customSerializer).toBe("function");
    expect(typeof inputConfig.serializer.experimentalSerializerHook).toBe(
      "function"
    );
    expect(toMock(CyclicDependencies).__context).toEqual({ timesCalled: 0 });
    expect(toMock(DuplicateDependencies).__context).toEqual({ timesCalled: 0 });
  });
});
