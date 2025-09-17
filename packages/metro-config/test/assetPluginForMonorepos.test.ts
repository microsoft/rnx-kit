import type { AssetData } from "metro";
import type { Middleware } from "metro-config";
import type Server from "metro/src/Server";
import { equal } from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, it } from "node:test";

describe("@rnx-kit/metro-config/assetPluginForMonorepos", () => {
  const assetPlugin = require("../src/assetPluginForMonorepos");
  const { enhanceMiddleware } = assetPlugin;

  const cases = [
    ["/assets/./node_modules", "/assets/./node_modules"],
    ["/assets/../node_modules", "/assets/@@/node_modules"],
    ["/assets/../../node_modules", "/assets/@@/@@/node_modules"],
    [
      "/assets/node_modules/../../react-native",
      "/assets/node_modules/@@/@@/react-native",
    ],
  ] as const;

  it("escapes `..` in URLs", () => {
    for (const [input, output] of cases) {
      const assetData = { httpServerLocation: input } as AssetData;
      equal(assetPlugin(assetData).httpServerLocation, output);
    }
  });

  it("unescapes `..` in URLs", () => {
    for (const [output, input] of cases) {
      const middleware: Middleware = (req: Middleware) => {
        equal("url" in req && req.url, output);
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
    }
  });
});
