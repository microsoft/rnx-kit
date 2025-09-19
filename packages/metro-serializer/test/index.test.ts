import type { Graph, SerializerOptions } from "metro";
import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CustomSerializerResult, MetroPlugin } from "../src/index";
import { MetroSerializer as MetroSerializerActual } from "../src/index";

function isPromise<T>(obj: T | Promise<T>): obj is Promise<T> {
  return obj && typeof obj === "object" && typeof obj["then"] === "function";
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
  function MetroSerializer(plugins: MetroPlugin[]) {
    return MetroSerializerActual(plugins, {
      baseJSBundle: () => ({
        modules: [],
        post: "",
        pre: "",
      }),
      bundleToString: () => ({
        code: "code",
        map: "",
      }),
    });
  }

  const mockGraph = {} as Graph;
  const mockOptions = {} as SerializerOptions;

  it("works without plugins", async () => {
    const serializer = MetroSerializer([]);
    const result = serializer("entryPoint", [], mockGraph, mockOptions);
    equal(await getBundleCode(result), "code");
  });

  it("calls plugins in specified order", async () => {
    const callOrder: number[] = [];
    const serializer = MetroSerializer([
      () => callOrder.push(1),
      () => callOrder.push(2),
      () => callOrder.push(3),
    ]);
    const result = serializer("entryPoint", [], mockGraph, mockOptions);

    deepEqual(callOrder, callOrder.sort());
    equal(await getBundleCode(result), "code");
  });
});
