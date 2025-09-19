import assert from "node:assert";
import { beforeEach, describe, it } from "node:test";
import {
  ansiColor,
  encodeAnsi256,
  encodeColor,
  fontStyle,
  overrideColorSupport,
} from "../src/colors.ts";

describe("colors", () => {
  describe("encodeColor disabled", () => {
    beforeEach(() => {
      // Clear any existing cached color functions
      overrideColorSupport(false);
    });

    it("should return original string when colors are disabled", () => {
      const result = encodeColor("test text", 31, 39);
      assert.strictEqual(result, "test text");
    });

    it("should handle string color codes", () => {
      const result = encodeColor("test", "31", "39");
      assert.strictEqual(result, "test");
    });

    it("should handle number color codes", () => {
      const result = encodeColor("test", 31, 39);
      assert.strictEqual(result, "test");
    });

    it("should work with empty string", () => {
      const result = encodeColor("", 31, 39);
      assert.strictEqual(result, "");
    });

    it("should work with special characters", () => {
      const text = "hello\nworld\t!@#$%";
      const result = encodeColor(text, 31, 39);
      assert.strictEqual(result, text);
    });
  });

  describe("encodeColor enabled", () => {
    beforeEach(() => {
      // Clear any existing cached color functions
      overrideColorSupport(true);
    });

    it("should return original string when colors are enabled", () => {
      const result = encodeColor("test text", 31, 39);
      assert.strictEqual(result, "\u001B[31mtest text\u001B[39m");
    });

    it("should handle string color codes", () => {
      const result = encodeColor("test", "31", "39");
      assert.strictEqual(result, "\u001B[31mtest\u001B[39m");
    });

    it("should handle number color codes", () => {
      const result = encodeColor("test", 31, 39);
      assert.strictEqual(result, "\u001B[31mtest\u001B[39m");
    });

    it("should work with empty string", () => {
      const result = encodeColor("", 31, 39);
      assert.strictEqual(result, "\u001B[31m\u001B[39m");
    });

    it("should work with special characters", () => {
      const text = "hello\nworld\t!@#$%";
      const result = encodeColor(text, 31, 39);
      assert.strictEqual(result, "\u001B[31mhello\nworld\t!@#$%\u001B[39m");
    });
  });

  describe("ansiColor", () => {
    let colors: ReturnType<typeof ansiColor>;

    beforeEach(() => {
      colors = ansiColor();
    });

    it("should return color functions object", () => {
      assert(typeof colors === "object");
      assert(colors !== null);
    });

    it("should have all basic color functions", () => {
      const expectedColors = [
        "black",
        "red",
        "green",
        "yellow",
        "blue",
        "magenta",
        "cyan",
        "white",
      ];

      for (const color of expectedColors) {
        assert(typeof colors[color as keyof typeof colors] === "function");
      }
    });

    it("should have all bright color functions", () => {
      const expectedBrightColors = [
        "blackBright",
        "redBright",
        "greenBright",
        "yellowBright",
        "blueBright",
        "magentaBright",
        "cyanBright",
        "whiteBright",
      ];

      for (const color of expectedBrightColors) {
        assert(typeof colors[color as keyof typeof colors] === "function");
      }
    });

    it("should return input text when colors disabled", () => {
      overrideColorSupport(false);
      const text = "test text";

      assert.strictEqual(colors.red(text), text);
      assert.strictEqual(colors.green(text), text);
      assert.strictEqual(colors.blue(text), text);
      assert.strictEqual(colors.redBright(text), text);
    });

    it("should decorate text correctly when colors are enabled", () => {
      overrideColorSupport(true);
      const text = "test text";

      assert.strictEqual(colors.red(text), "\u001B[31mtest text\u001B[39m");
      assert.strictEqual(colors.green(text), "\u001B[32mtest text\u001B[39m");
      assert.strictEqual(colors.blue(text), "\u001B[34mtest text\u001B[39m");
      assert.strictEqual(
        colors.redBright(text),
        "\u001B[91mtest text\u001B[39m"
      );
    });

    it("should handle empty strings", () => {
      overrideColorSupport(true);
      assert.strictEqual(colors.red(""), "\u001B[31m\u001B[39m");
      assert.strictEqual(colors.blueBright(""), "\u001B[94m\u001B[39m");
    });

    it("should handle special characters", () => {
      overrideColorSupport(false);
      const specialText = "hello\nworld\t!@#$%^&*()";
      assert.strictEqual(colors.yellow(specialText), specialText);
    });

    it("should be consistent across multiple calls", () => {
      overrideColorSupport(true);
      const text = "consistent test";
      const result1 = colors.green(text);
      const result2 = colors.green(text);

      assert.strictEqual(result1, result2);
    });
  });

  describe("fontStyle", () => {
    let styles: ReturnType<typeof fontStyle>;

    beforeEach(() => {
      styles = fontStyle();
    });

    it("should return style functions object", () => {
      assert(typeof styles === "object");
      assert(styles !== null);
    });

    it("should have all style functions", () => {
      const expectedStyles = [
        "bold",
        "dim",
        "italic",
        "underline",
        "strikethrough",
      ];

      for (const style of expectedStyles) {
        assert(typeof styles[style as keyof typeof styles] === "function");
      }
    });

    it("should return input text when colors disabled", () => {
      overrideColorSupport(false);
      const text = "styled text";

      assert.strictEqual(styles.bold(text), text);
      assert.strictEqual(styles.dim(text), text);
      assert.strictEqual(styles.italic(text), text);
      assert.strictEqual(styles.underline(text), text);
      assert.strictEqual(styles.strikethrough(text), text);
    });

    it("should handle empty strings", () => {
      assert.strictEqual(styles.bold(""), "");
      assert.strictEqual(styles.italic(""), "");
    });

    it("should handle multiline text", () => {
      const multilineText = "line 1\nline 2\nline 3";
      assert.strictEqual(styles.underline(multilineText), multilineText);
      overrideColorSupport(true);
      assert.strictEqual(
        styles.underline(multilineText),
        `\u001B[4mline 1\nline 2\nline 3\u001B[24m`
      );
    });

    it("should be consistent across multiple calls", () => {
      overrideColorSupport(true);
      const text = "consistency test";
      const result1 = styles.bold(text);
      const result2 = styles.bold(text);

      assert.strictEqual(result1, result2);
    });
  });

  describe("encodeAnsi256", () => {
    it("should return original string when colors disabled", () => {
      overrideColorSupport(false);
      const text = "256 color test";
      const result = encodeAnsi256(text, 196); // bright red

      assert.strictEqual(result, text);
    });

    it("should handle color code 0", () => {
      overrideColorSupport(true);
      const result = encodeAnsi256("test", 0);
      assert.strictEqual(result, "\u001B[38;5;0mtest\u001B[39m");
    });

    it("should handle color code 255", () => {
      overrideColorSupport(true);
      const result = encodeAnsi256("test", 255);
      assert.strictEqual(result, "\u001B[38;5;255mtest\u001B[39m");
    });
  });

  describe("lazy initialization", () => {
    it("should initialize ansiColor lazily", () => {
      // Multiple calls should return the same object reference
      const colors1 = ansiColor();
      const colors2 = ansiColor();

      assert.strictEqual(colors1, colors2);
    });

    it("should initialize fontStyle lazily", () => {
      // Multiple calls should return the same object reference
      const styles1 = fontStyle();
      const styles2 = fontStyle();

      assert.strictEqual(styles1, styles2);
    });
  });

  describe("edge cases", () => {
    it("should handle very long strings", () => {
      overrideColorSupport(false);
      const longText = "a".repeat(10000);
      const colors = ansiColor();
      const styles = fontStyle();

      assert.strictEqual(colors.blue(longText), longText);
      assert.strictEqual(styles.bold(longText), longText);
      assert.strictEqual(encodeAnsi256(longText, 100), longText);
    });

    it("should handle unicode characters", () => {
      overrideColorSupport(true);
      const unicodeText = "Hello 世界 🌍 émojis 🎉";
      const greenUnicode = `\u001B[32m${unicodeText}\u001B[39m`;
      const italicUnicode = `\u001B[3m${unicodeText}\u001B[23m`;
      const ansi256Unicode = `\u001B[38;5;200m${unicodeText}\u001B[39m`;
      const colors = ansiColor();
      const styles = fontStyle();

      assert.strictEqual(colors.green(unicodeText), greenUnicode);
      assert.strictEqual(styles.italic(unicodeText), italicUnicode);
      assert.strictEqual(encodeAnsi256(unicodeText, 200), ansi256Unicode);
    });

    it("should handle null and undefined gracefully", () => {
      overrideColorSupport(false);
      const colors = ansiColor();
      const styles = fontStyle();

      // TypeScript should prevent this, but test runtime behavior
      assert.strictEqual(colors.red(null as any), "null");
      assert.strictEqual(colors.red(undefined as any), "undefined");
      assert.strictEqual(styles.bold(null as any), "null");
      assert.strictEqual(styles.bold(undefined as any), "undefined");
    });
  });
});
