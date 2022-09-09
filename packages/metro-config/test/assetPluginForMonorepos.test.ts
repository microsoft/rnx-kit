import type { IncomingMessage, ServerResponse } from "http";
import type { AssetData } from "metro";
import type { Middleware } from "metro-config";
import type Server from "metro/src/Server";

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

  test("escapes `..` in URLs", () => {
    Object.entries(cases).forEach(([input, output]) => {
      const assetData = { httpServerLocation: input } as AssetData;
      expect(assetPlugin(assetData)).toEqual(
        expect.objectContaining({
          httpServerLocation: output,
        })
      );
    });
  });

  test("unescapes `..` in URLs", () => {
    Object.entries(cases).forEach(([output, input]) => {
      const middleware: Middleware = (req) => {
        expect(req).toEqual(expect.objectContaining({ url: output }));
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
