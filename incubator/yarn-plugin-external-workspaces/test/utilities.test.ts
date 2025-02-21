import assert from "node:assert";
import { describe, it } from "node:test";
import { decodeRange, encodeRange } from "../src/utilities";

describe("Utilities", () => {
  describe("encodeRange", () => {
    it("should encode a range with the package name", () => {
      const name = "workspace-name";
      const resolutionRange = "external:1.0.0";
      const encoded = encodeRange(name, resolutionRange);
      assert.strictEqual(encoded, "external:workspace-name@1.0.0");
    });

    it("should work with a scoped package name", () => {
      const name = "@scope/workspace-name";
      const resolutionRange = "external:1.0.0";
      const encoded = encodeRange(name, resolutionRange);
      assert.strictEqual(encoded, "external:@scope/workspace-name@1.0.0");
    });

    it("should return null if the resolution range does not start with the protocol", () => {
      const name = "workspace-name";
      const resolutionRange = "1.0.0";
      const encoded = encodeRange(name, resolutionRange);
      assert.strictEqual(encoded, null);
    });
  });

  describe("decodeRange", () => {
    it("should decode a range to name and version", () => {
      const range = "external:workspace-name@1.0.0";
      const decoded = decodeRange(range);
      assert.deepStrictEqual(decoded, {
        name: "workspace-name",
        version: "1.0.0",
      });
    });

    it("should decode a range with a scoped package name", () => {
      const range = "external:@scope/workspace-name@1.0.0";
      const decoded = decodeRange(range);
      assert.deepStrictEqual(decoded, {
        name: "@scope/workspace-name",
        version: "1.0.0",
      });
    });

    it("should throw an error if the range is invalid", () => {
      const range = "external:workspace-name";
      assert.throws(
        () => decodeRange(range),
        /Invalid range: external:workspace-name/
      );
    });
  });
});
