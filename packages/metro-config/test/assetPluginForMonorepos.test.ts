import type { IncomingMessage, ServerResponse } from "http";
import type { AssetData } from "metro";
import type { Middleware } from "metro-config";
import type Server from "metro/src/Server";
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";

describe("@rnx-kit/metro-config/assetPluginForMonorepos", () => {
  const assetPlugin = require("../src/assetPluginForMonorepos");
  const { enhanceMiddleware } = assetPlugin;

  const cases = {
    "/assets/./node_modules": "/assets/./node_modules",
    "/assets/../node_modules": "/assets/@@/node_modules",
    "/assets/../../node_modules": "/assets/@@/@@/node_modules",
    "/assets/node_modules/../../react-native":
      "/assets/node_modules/@@/@@/react-native",
  };

  it("escapes `..` in URLs", () => {
    Object.entries(cases).forEach(([input, output]) => {
      const assetData = { httpServerLocation: input } as AssetData;
      equal(assetPlugin(assetData).httpServerLocation, output);
    });
  });

  it("unescapes `..` in URLs", () => {
    Object.entries(cases).forEach(([output, input]) => {
      const middleware: Middleware = (req: Middleware) => {
        equal(req.url, output);
        return middleware;
      };
      const server = {
        _config: { transformer: { assetPlugins: [] } },
      } as unknown as Server;

      const incoming = { url: input } as IncomingMessage;
      const response = {} as ServerResponse;

      enhanceMiddleware(middleware, server)(
        incoming,
        response,
        () => undefined
      );
    });
  });
});
