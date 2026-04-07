import type { ConfigItem, PluginItem, PluginObj } from "@babel/core";
import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPluginKey,
  getPluginTarget,
  isConfigItem,
  isPluginObj,
  pluginTraceFactory,
} from "../src/plugins";
import { tracePassthrough } from "../src/tracing";

// ── Test helpers ─────────────────────────────────────────────────────

const pluginFn = () => ({ visitor: {} });

const samplePluginObj: PluginObj = {
  visitor: {
    Identifier() {
      // intentionally empty for testing
    },
  },
};

const sampleConfigItem = {
  value: pluginFn,
  options: {},
  dirname: "/test",
  file: undefined,
} as unknown as ConfigItem;

// ── isConfigItem ─────────────────────────────────────────────────────

describe("isConfigItem", () => {
  it("returns true for an object with a value property", () => {
    ok(isConfigItem(sampleConfigItem));
  });

  it("returns false for a plain plugin object (visitor)", () => {
    equal(isConfigItem(samplePluginObj as PluginItem), false);
  });

  it("returns false for a function", () => {
    equal(isConfigItem(pluginFn), false);
  });

  it("returns false for a string", () => {
    equal(isConfigItem("@babel/plugin-transform-arrow-functions"), false);
  });

  it("returns false for a tuple", () => {
    equal(isConfigItem([pluginFn, {}]), false);
  });

  it("returns false for null/undefined wrapped in array", () => {
    equal(isConfigItem([null as unknown as string]), false);
  });
});

// ── isPluginObj ──────────────────────────────────────────────────────

describe("isPluginObj", () => {
  it("returns true for an object with a visitor property", () => {
    ok(isPluginObj(samplePluginObj as PluginItem));
  });

  it("returns false for a ConfigItem", () => {
    equal(isPluginObj(sampleConfigItem), false);
  });

  it("returns false for a function", () => {
    equal(isPluginObj(pluginFn), false);
  });

  it("returns false for a string", () => {
    equal(isPluginObj("@babel/plugin-transform-arrow-functions"), false);
  });

  it("returns false for a tuple", () => {
    equal(isPluginObj([pluginFn, {}]), false);
  });
});

// ── getPluginTarget ──────────────────────────────────────────────────

describe("getPluginTarget", () => {
  it("returns the function for a bare function plugin", () => {
    equal(getPluginTarget(pluginFn), pluginFn);
  });

  it("returns the string for a string plugin", () => {
    equal(
      getPluginTarget("@babel/plugin-transform-arrow-functions"),
      "@babel/plugin-transform-arrow-functions"
    );
  });

  it("returns the first element for a tuple plugin", () => {
    equal(getPluginTarget([pluginFn, { loose: true }]), pluginFn);
  });

  it("returns the value from a ConfigItem", () => {
    equal(getPluginTarget(sampleConfigItem), pluginFn);
  });

  it("returns undefined for a PluginObj (resolved plugin)", () => {
    equal(getPluginTarget(samplePluginObj as PluginItem), undefined);
  });

  it("returns undefined for null", () => {
    equal(getPluginTarget(null as unknown as PluginItem), undefined);
  });

  it("returns undefined for undefined", () => {
    equal(getPluginTarget(undefined as unknown as PluginItem), undefined);
  });
});

// ── getPluginKey ─────────────────────────────────────────────────────

describe("getPluginKey", () => {
  it("returns the key from a resolved plugin with a key", () => {
    const resolved = {
      key: "transform-arrow-functions",
      visitor: {},
      options: {},
    };
    equal(
      getPluginKey(resolved as unknown as PluginItem),
      "transform-arrow-functions"
    );
  });

  it("returns null for a resolved plugin with null key", () => {
    const resolved = { key: null, visitor: {}, options: {} };
    equal(getPluginKey(resolved as unknown as PluginItem), null);
  });

  it("returns undefined for a resolved plugin with undefined key", () => {
    const resolved = { key: undefined, visitor: {}, options: {} };
    equal(getPluginKey(resolved as unknown as PluginItem), undefined);
  });

  it("returns undefined for a non-PluginObj", () => {
    equal(getPluginKey(pluginFn), undefined);
  });

  it("returns undefined for a string plugin", () => {
    equal(getPluginKey("@babel/plugin-transform-arrow-functions"), undefined);
  });

  it("returns undefined for a tuple plugin", () => {
    equal(getPluginKey([pluginFn, {}]), undefined);
  });
});

// ── pluginTraceFactory ───────────────────────────────────────────────

describe("pluginTraceFactory", () => {
  it("returns a wrapper function", () => {
    const wrapper = pluginTraceFactory(tracePassthrough);
    equal(typeof wrapper, "function");
  });

  it("returns the same factory on subsequent calls", () => {
    const wrapper1 = pluginTraceFactory(tracePassthrough);
    const wrapper2 = pluginTraceFactory(tracePassthrough);
    equal(wrapper1, wrapper2);
  });

  it("wraps a visitor method and preserves its behavior", () => {
    const factory = pluginTraceFactory(tracePassthrough);
    const calls: string[] = [];
    const original = (arg: string) => {
      calls.push(arg);
    };
    const wrapped = factory("my-plugin", "enter", original);
    wrapped("hello");
    wrapped("world");
    deepEqual(calls, ["hello", "world"]);
  });

  it("wraps a visitor method and preserves return value", () => {
    const factory = pluginTraceFactory(tracePassthrough);
    const original = (x: number) => x * 2;
    const wrapped = factory("my-plugin", "enter", original);
    equal(wrapped(21), 42);
  });

  it("wraps a visitor method and preserves this binding", () => {
    const factory = pluginTraceFactory(tracePassthrough);
    const capture: { value: unknown } = { value: undefined };
    const original = function (this: unknown) {
      capture.value = this;
    };
    const wrapped = factory("my-plugin", "enter", original);
    const context = { name: "test" };
    wrapped.call(context);
    equal(capture.value, context);
  });
});
