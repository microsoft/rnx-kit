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
      const assetData = /** @type {import("metro").AssetData} */ ({
        httpServerLocation: input,
      });
      expect(assetPlugin(assetData)).toEqual(
        expect.objectContaining({
          httpServerLocation: output,
        })
      );
    });
  });

  test("unescapes `..` in URLs", () => {
    Object.entries(cases).forEach(([output, input]) => {
      /** @type {import("metro-config").Middleware} */
      const middleware = (req) => {
        expect(req).toEqual(expect.objectContaining({ url: output }));
        return middleware;
      };
      const incoming = /** @type {import("http").IncomingMessage} */ ({
        url: input,
      });
      const response = /** @type {import("http").ServerResponse} */ ({});
      enhanceMiddleware(middleware)(incoming, response, () => undefined);
    });
  });
});
