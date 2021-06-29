import { MetroSerializer, CustomSerializerResult } from "../src/index";
import type { Graph, SerializerOptions } from "metro";

jest.mock("metro/src/DeltaBundler/Serializers/baseJSBundle");
jest.mock("metro/src/lib/bundleToString");

function isPromise<T>(obj: T | Promise<T>): obj is Promise<T> {
  return typeof obj === "object" && typeof obj["then"] === "function";
}

async function getBundleCode(
  bundle: CustomSerializerResult | Promise<CustomSerializerResult>
): Promise<string> {
  if (isPromise(bundle)) {
    return getBundleCode(await bundle);
  }

  if (typeof bundle === "string") {
    return bundle;
  }

  throw new Error(`Expected 'string', got '${typeof bundle}'`);
}

describe("MetroSerializer", () => {
  const baseJSBundle = require("metro/src/DeltaBundler/Serializers/baseJSBundle");
  baseJSBundle.mockImplementation(() => undefined);

  const bundleToString = require("metro/src/lib/bundleToString");
  bundleToString.mockImplementation(() => ({
    code: "code",
    map: undefined,
  }));

  const mockGraph = {} as Graph;
  const mockOptions = {} as SerializerOptions;

  test("works without plugins", async () => {
    const serializer = MetroSerializer([]);
    const result = serializer("entryPoint", [], mockGraph, mockOptions);
    expect(await getBundleCode(result)).toBe("code");
  });

  test("calls plugins in specified order", async () => {
    const callOrder = [];
    const serializer = MetroSerializer([
      () => callOrder.push(1),
      () => callOrder.push(2),
      () => callOrder.push(3),
    ]);
    const result = serializer("entryPoint", [], mockGraph, mockOptions);
    expect(callOrder).toEqual(callOrder.sort());

    expect(await getBundleCode(result)).toBe("code");
  });
});
