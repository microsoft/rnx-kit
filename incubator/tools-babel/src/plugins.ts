import type {
  PluginItem,
  PluginObj,
  ConfigItem,
  PluginTarget,
  TransformOptions,
} from "@babel/core";
import type { TraceFunction } from "./types";

export type ResolvedPlugin = {
  key: string | undefined | null;
  manipulateOptions?: PluginObj["manipulateOptions"];
  post?: PluginObj["post"];
  pre?: PluginObj["pre"];
  visitor: PluginObj["visitor"];
  options: object;
};

// oxlint-disable-next-line typescript/no-explicit-any
type AnyFuncType = (...args: any[]) => void;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isConfigItem(plugin: PluginItem): plugin is ConfigItem {
  return isPlainObject(plugin) && "value" in plugin;
}

export function isPluginObj(plugin: PluginItem): plugin is PluginObj {
  return isPlainObject(plugin) && "visitor" in plugin;
}

export function getPluginTarget(plugin: PluginItem): PluginTarget | undefined {
  if (plugin != null) {
    if (Array.isArray(plugin)) {
      return plugin[0];
    } else if (isConfigItem(plugin)) {
      return plugin.value;
    } else if (!isPluginObj(plugin)) {
      return plugin;
    }
  }
  return undefined;
}

export function getPluginKey(plugin: PluginItem): string | null | undefined {
  if (isPluginObj(plugin)) {
    return (plugin as ResolvedPlugin).key;
  }
  return undefined;
}

/**
 * Create the trace factory that wraps visitor methods for instrumentation
 */
export const pluginTraceFactory = (() => {
  let factory: TransformOptions["wrapPluginVisitorMethod"] | null = null;
  return (trace: TraceFunction) => {
    if (factory) {
      return factory;
    }
    return (factory = <T extends AnyFuncType>(
      key: string,
      _visitorType: "enter" | "exit",
      fn: AnyFuncType
    ) => {
      const opName = `--plugin: ${key}`;
      function thisWrapper(this: ThisParameterType<T>, ...args: Parameters<T>) {
        return trace(opName, () => fn.apply(this, args));
      }
      return thisWrapper;
    });
  };
})();
