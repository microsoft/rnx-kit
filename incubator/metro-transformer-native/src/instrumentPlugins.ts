import type { PluginItem, PluginObj } from "@babel/core";
import type { PluginCache } from "./babelPluginCache";
import type { PerfTracer } from "./types";

type VisitorMethod = (...args: unknown[]) => void;

/**
 * Wraps a single visitor method to record its execution time under the given trace name.
 */
function wrapVisitorMethod(
  method: VisitorMethod,
  tracer: PerfTracer,
  name: string
): VisitorMethod {
  return (...args: unknown[]) => {
    const start = performance.now();
    try {
      return method(...args);
    } finally {
      tracer.record(name, performance.now() - start);
    }
  };
}

/**
 * Wraps visitor methods in a plugin result object so that each visitor
 * invocation is timed and recorded in the perf tracer.
 */
function wrapPluginResult(
  result: PluginObj,
  tracer: PerfTracer,
  pluginName: string
): PluginObj {
  const { visitor } = result;
  if (!visitor) {
    return result;
  }

  const wrappedVisitor: Record<string, unknown> = {};
  for (const [nodeType, handler] of Object.entries(visitor)) {
    if (typeof handler === "function") {
      wrappedVisitor[nodeType] = wrapVisitorMethod(
        handler as VisitorMethod,
        tracer,
        `plugin ${pluginName} [${nodeType}]`
      );
    } else if (handler && typeof handler === "object") {
      // handler can be { enter?, exit? }
      const enterExit = handler as {
        enter?: VisitorMethod;
        exit?: VisitorMethod;
      };
      const wrapped: { enter?: VisitorMethod; exit?: VisitorMethod } = {};
      if (enterExit.enter) {
        wrapped.enter = wrapVisitorMethod(
          enterExit.enter,
          tracer,
          `plugin ${pluginName} [${nodeType}.enter]`
        );
      }
      if (enterExit.exit) {
        wrapped.exit = wrapVisitorMethod(
          enterExit.exit,
          tracer,
          `plugin ${pluginName} [${nodeType}.exit]`
        );
      }
      wrappedVisitor[nodeType] = { ...enterExit, ...wrapped };
    } else {
      wrappedVisitor[nodeType] = handler;
    }
  }

  return { ...result, visitor: wrappedVisitor };
}

/**
 * Wraps a plugin factory function so that the visitor methods it returns
 * are instrumented with performance tracing.
 */
function wrapPluginFactory(
  // oxlint-disable-next-line typescript/no-explicit-any
  factory: (...args: any[]) => PluginObj,
  tracer: PerfTracer,
  pluginName: string
  // oxlint-disable-next-line typescript/no-explicit-any
): (...args: any[]) => PluginObj {
  return (...args: unknown[]) => {
    const result = factory(...args);
    return wrapPluginResult(result, tracer, pluginName);
  };
}

/**
 * Instruments all plugins in the array with performance tracing. Each plugin's
 * visitor methods will be wrapped to record execution time, bucketed by plugin
 * name (from the PluginCache) and visitor node type.
 *
 * @param plugins the babel plugins array to instrument
 * @param cache plugin cache used to identify plugin names
 * @param tracer the performance tracer to record timing data to
 * @returns a new plugins array with instrumented plugins
 */
export function instrumentPlugins(
  plugins: PluginItem[],
  cache: PluginCache,
  tracer: PerfTracer
): PluginItem[] {
  return plugins.map((plugin, index) => {
    const name = cache.identify(plugin) ?? `unknown-plugin-${index}`;

    if (typeof plugin === "function") {
      // oxlint-disable-next-line typescript/no-explicit-any
      return wrapPluginFactory(plugin as (...args: any[]) => PluginObj, tracer, name);
    }

    if (Array.isArray(plugin) && typeof plugin[0] === "function") {
      // oxlint-disable-next-line typescript/no-explicit-any
      const factory = plugin[0] as (...args: any[]) => PluginObj;
      return [wrapPluginFactory(factory, tracer, name), ...plugin.slice(1)];
    }

    // string plugins or other forms — can't wrap, return as-is
    return plugin;
  });
}
