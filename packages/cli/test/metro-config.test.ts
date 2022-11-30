import { CyclicDependencies } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import { DuplicateDependencies } from "@rnx-kit/metro-plugin-duplicates-checker";
import type { InputConfigT } from "metro-config";
import { customizeMetroConfig } from "../src/metro-config";

jest.mock("@rnx-kit/metro-plugin-cyclic-dependencies-detector", () => {
  return {
    CyclicDependencies: jest.fn(),
  };
});

jest.mock("@rnx-kit/metro-plugin-duplicates-checker", () => {
  return {
    DuplicateDependencies: jest.fn(),
  };
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

describe("cli/metro-config/customizeMetroConfig", () => {
  afterEach(() => {
    (CyclicDependencies as any).mockClear();
    (DuplicateDependencies as any).mockClear();
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
    expect(CyclicDependencies).toHaveBeenCalledWith();
    expect(DuplicateDependencies).toHaveBeenCalledWith();
  });

  test("returns a config without a custom serializer when there are no plugins", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      detectCyclicDependencies: false,
      detectDuplicateDependencies: false,
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
    expect(CyclicDependencies).not.toHaveBeenCalled();
    expect(DuplicateDependencies).not.toHaveBeenCalled();
  });

  test("returns a config with only duplicates plugin", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      detectCyclicDependencies: false,
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
    expect(CyclicDependencies).not.toHaveBeenCalled();
    expect(DuplicateDependencies).toHaveBeenCalledWith();
  });

  test("returns a config with only cyclic dependencies plugin", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      detectDuplicateDependencies: false,
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
    expect(CyclicDependencies).toHaveBeenCalledWith();
    expect(DuplicateDependencies).not.toHaveBeenCalled();
  });

  test("forwards plugin options", () => {
    const inputConfig = makeMockConfig();
    const cyclicDependenciesOptions = { cyclicDependencies: true } as any;
    const duplicateDependencesOptions = { duplicateDependencies: true } as any;
    customizeMetroConfig(inputConfig, {
      detectCyclicDependencies: cyclicDependenciesOptions,
      detectDuplicateDependencies: duplicateDependencesOptions,
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
    expect(CyclicDependencies).toHaveBeenCalledWith(cyclicDependenciesOptions);
    expect(DuplicateDependencies).toHaveBeenCalledWith(
      duplicateDependencesOptions
    );
  });

  test("returns a config with a custom serializer when tree shaking is enabled", () => {
    const inputConfig = makeMockConfig();
    customizeMetroConfig(inputConfig, {
      detectCyclicDependencies: false,
      detectDuplicateDependencies: false,
      treeShake: true,
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
    expect(CyclicDependencies).not.toHaveBeenCalled();
    expect(DuplicateDependencies).not.toHaveBeenCalled();
  });
});
