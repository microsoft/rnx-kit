import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  colorPackage,
  createFormatter,
  formatDuration,
  getFormatter,
  padString,
} from "../src/formatting.ts";

describe("formatting", () => {
  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      const result = formatDuration(123);
      assert.strictEqual(result, "123ms");
    });

    it("should format seconds", () => {
      const result = formatDuration(1500);
      assert.strictEqual(result, "1.50s");
    });

    it("should format minutes", () => {
      const result = formatDuration(125000);
      assert.strictEqual(result, "2.08m");
    });

    it("should handle zero duration", () => {
      const result = formatDuration(0);
      assert.strictEqual(result, "0.00ms");
    });

    it("should handle very small durations", () => {
      const result = formatDuration(0.1);
      assert.strictEqual(result, "0.10ms");
    });

    it("should handle very large durations", () => {
      const result = formatDuration(3600000); // 1 hour
      assert.strictEqual(result, "60.0m");
    });

    it("should use custom color functions", () => {
      const mockValue = (s: string) => `VALUE[${s}]`;
      const mockUnits = (s: string) => `UNITS[${s}]`;

      const result = formatDuration(1500, mockValue, mockUnits);
      assert.strictEqual(result, "VALUE[1.50]UNITS[s]");
    });

    it("should handle edge case around unit boundaries", () => {
      assert.strictEqual(formatDuration(999), "999ms");
      assert.strictEqual(formatDuration(1000), "1.00s");
      assert.strictEqual(formatDuration(1001), "1.00s");

      assert.strictEqual(formatDuration(119999), "120s");
      assert.strictEqual(formatDuration(120000), "2.00m");
      assert.strictEqual(formatDuration(120001), "2.00m");
    });

    it("should format decimal places appropriately", () => {
      // Large numbers should have fewer decimal places
      assert.strictEqual(formatDuration(10000), "10.0s");
      assert.strictEqual(formatDuration(100000), "100s");

      // Small numbers should have more decimal places
      assert.strictEqual(formatDuration(1.23), "1.23ms");
      assert.strictEqual(formatDuration(12.3), "12.3ms");
      assert.strictEqual(formatDuration(123), "123ms");
    });
  });

  describe("colorPackage", () => {
    it("should color simple package name", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage("my-package", mockPackageName, mockScope);
      assert.strictEqual(result, "PKG[my-package]");
    });

    it("should color scoped package name", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage(
        "@scope/my-package",
        mockPackageName,
        mockScope
      );
      assert.strictEqual(result, "SCOPE[@scope]PKG[/my-package]");
    });

    it("should handle deeply scoped packages", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage(
        "@org/sub/deep/package",
        mockPackageName,
        mockScope
      );
      assert.strictEqual(result, "SCOPE[@org]PKG[/sub/deep/package]");
    });

    it("should handle package with no scope", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage("simple-package", mockPackageName, mockScope);
      assert.strictEqual(result, "PKG[simple-package]");
    });

    it("should handle empty package name", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage("", mockPackageName, mockScope);
      assert.strictEqual(result, "PKG[]");
    });

    it("should handle malformed scoped package", () => {
      const mockPackageName = (s: string) => `PKG[${s}]`;
      const mockScope = (s: string) => `SCOPE[${s}]`;

      const result = colorPackage("@scope/", mockPackageName, mockScope);
      assert.strictEqual(result, "SCOPE[@scope]PKG[/]");
    });

    it("should use identity functions by default", () => {
      const result = colorPackage("@test/package");
      assert.strictEqual(result, "@test/package");
    });
  });

  describe("padString", () => {
    it("should pad string to right by default", () => {
      const result = padString("test", 8);
      assert.strictEqual(result, "    test");
    });

    it("should pad string to left", () => {
      const result = padString("test", 8, "left");
      assert.strictEqual(result, "test    ");
    });

    it("should pad string to center", () => {
      const result = padString("test", 8, "center");
      assert.strictEqual(result, "  test  ");
    });

    it("should handle odd padding for center alignment", () => {
      const result = padString("test", 9, "center");
      assert.strictEqual(result, "  test   ");
    });

    it("should not pad if string is already long enough", () => {
      const result = padString("long string", 8);
      assert.strictEqual(result, "long string");
    });

    it("should handle exact length match", () => {
      const result = padString("exactly", 7);
      assert.strictEqual(result, "exactly");
    });

    it("should handle empty string", () => {
      const result = padString("", 5);
      assert.strictEqual(result, "     ");
    });

    it("should handle zero length padding", () => {
      const result = padString("test", 0);
      assert.strictEqual(result, "test");
    });

    it("should handle negative length", () => {
      const result = padString("test", -5);
      assert.strictEqual(result, "test");
    });

    it("should ignore VT control characters in length calculation", () => {
      // Since colors are disabled in tests, we simulate VT characters
      const coloredString = "\\u001B[31mtest\\u001B[39m";
      const result = padString(coloredString, 10);
      // Should pad based on visible length, not including escape sequences
      assert(result.length >= 10);
    });

    it("should handle unicode characters correctly", () => {
      const result = padString("test🌟", 8);
      assert.strictEqual(result.length, 8);
    });
  });

  describe("getFormatter", () => {
    let formatter: ReturnType<typeof getFormatter>;

    beforeEach(() => {
      formatter = getFormatter();
    });

    it("should return formatter object", () => {
      assert(typeof formatter === "object");
      assert(formatter !== null);
    });

    it("should have all color functions", () => {
      const colors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ];
      for (const color of colors) {
        assert(
          typeof formatter[color as keyof typeof formatter] === "function"
        );
      }
    });

    it("should have all bright color functions", () => {
      const brightColors = [
        "blackBright",
        "redBright",
        "greenBright",
        "yellowBright",
        "blueBright",
        "magentaBright",
        "cyanBright",
        "whiteBright",
      ];
      for (const color of brightColors) {
        assert(
          typeof formatter[color as keyof typeof formatter] === "function"
        );
      }
    });

    it("should have font style functions", () => {
      const styles = ["bold", "dim", "italic", "underline", "strikethrough"];
      for (const style of styles) {
        assert(
          typeof formatter[style as keyof typeof formatter] === "function"
        );
      }
    });

    it("should have semantic color functions", () => {
      const semanticColors = [
        "durationValue",
        "durationUnits",
        "highlight1",
        "highlight2",
        "highlight3",
        "packageName",
        "packageScope",
        "path",
      ];
      for (const semantic of semanticColors) {
        assert(
          typeof formatter[semantic as keyof typeof formatter] === "function"
        );
      }
    });

    it("should have utility functions", () => {
      assert(typeof formatter.pad === "function");
      assert(typeof formatter.duration === "function");
      assert(typeof formatter.package === "function");
    });

    it("should format duration correctly", () => {
      const result = formatter.duration(1500);
      assert(typeof result === "string");
      assert(result.includes("1.50"));
      assert(result.includes("s"));
    });

    it("should format package names correctly", () => {
      const simple = formatter.package("my-package");
      assert(typeof simple === "string");

      const scoped = formatter.package("@scope/package");
      assert(typeof scoped === "string");
    });

    it("should use pad function correctly", () => {
      const result = formatter.pad("test", 8);
      assert.strictEqual(result, "    test");
    });

    it("should be lazily initialized", () => {
      const formatter1 = getFormatter();
      const formatter2 = getFormatter();
      assert.strictEqual(formatter1, formatter2);
    });
  });

  describe("createFormatter", () => {
    it("should create formatter with custom settings", () => {
      const customFormatter = createFormatter({
        durationValue: (s) => `CUSTOM[${s}]`,
        packageName: (s) => `PKG[${s}]`,
      });

      assert(typeof customFormatter === "object");
      assert(typeof customFormatter.duration === "function");
      assert(typeof customFormatter.package === "function");
    });

    it("should override specific functions", () => {
      const customFormatter = createFormatter({
        durationValue: (s) => `VALUE[${s}]`,
        durationUnits: (s) => `UNITS[${s}]`,
      });

      const result = customFormatter.duration(1500);
      assert(result.includes("VALUE[1.50]"));
      assert(result.includes("UNITS[s]"));
    });

    it("should inherit unspecified functions from base", () => {
      const baseFormatter = getFormatter();
      const customFormatter = createFormatter({
        packageName: (s) => `CUSTOM[${s}]`,
      });

      // Should inherit most functions from base
      assert.strictEqual(customFormatter.bold, baseFormatter.bold);
      assert.strictEqual(customFormatter.red, baseFormatter.red);
      assert.strictEqual(customFormatter.pad, baseFormatter.pad);
    });

    it("should work with custom base formatter", () => {
      const baseFormatter = createFormatter({
        bold: (s) => `BASE_BOLD[${s}]`,
      });

      const customFormatter = createFormatter(
        {
          italic: (s) => `CUSTOM_ITALIC[${s}]`,
        },
        baseFormatter
      );

      assert.strictEqual(customFormatter.bold("test"), "BASE_BOLD[test]");
      assert.strictEqual(customFormatter.italic("test"), "CUSTOM_ITALIC[test]");
    });

    it("should handle empty settings", () => {
      const customFormatter = createFormatter({});
      const baseFormatter = getFormatter();

      // Should behave like base formatter
      assert.strictEqual(
        customFormatter.duration(1000),
        baseFormatter.duration(1000)
      );
      assert.strictEqual(
        customFormatter.package("test"),
        baseFormatter.package("test")
      );
    });

    it("should properly rebuild dynamic functions", () => {
      const customFormatter = createFormatter({
        durationValue: (s) => `[${s}]`,
        packageScope: (s) => `{${s}}`,
      });

      const durationResult = customFormatter.duration(1500);
      assert(durationResult.includes("[1.50]"));

      const packageResult = customFormatter.package("@scope/package");
      assert(packageResult.includes("{@scope}"));
    });
  });

  describe("integration tests", () => {
    it("should work with complex formatting scenarios", () => {
      const formatter = getFormatter();

      // Test chaining multiple formatters
      const text = "test";
      const result = formatter.bold(formatter.red(text));
      assert.strictEqual(result, text); // Colors disabled in test
    });

    it("should handle edge cases in dynamic functions", () => {
      const formatter = getFormatter();

      // Test edge cases
      assert(typeof formatter.duration(0) === "string");
      assert(typeof formatter.duration(Infinity) === "string");
      assert(typeof formatter.package("") === "string");
      assert(typeof formatter.package("@") === "string");
    });

    it("should maintain consistency across multiple calls", () => {
      const formatter = getFormatter();

      const duration1 = formatter.duration(1500);
      const duration2 = formatter.duration(1500);
      assert.strictEqual(duration1, duration2);

      const package1 = formatter.package("@test/pkg");
      const package2 = formatter.package("@test/pkg");
      assert.strictEqual(package1, package2);
    });
  });
});
