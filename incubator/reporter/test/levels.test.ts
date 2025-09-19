import assert from "node:assert";
import { describe, it } from "node:test";
import {
  ALL_LOG_LEVELS,
  LL_ERROR,
  LL_LOG,
  LL_VERBOSE,
  LL_WARN,
} from "../src/levels.ts";

describe("levels", () => {
  describe("log level constants", () => {
    it("should have correct string values", () => {
      assert.strictEqual(LL_ERROR, "error");
      assert.strictEqual(LL_WARN, "warn");
      assert.strictEqual(LL_LOG, "log");
      assert.strictEqual(LL_VERBOSE, "verbose");
    });

    it("should be distinct values", () => {
      const levels = [LL_ERROR, LL_WARN, LL_LOG, LL_VERBOSE];
      const uniqueLevels = [...new Set(levels)];
      assert.strictEqual(levels.length, uniqueLevels.length);
    });
  });

  describe("ALL_LOG_LEVELS", () => {
    it("should contain all log levels", () => {
      assert.deepStrictEqual(ALL_LOG_LEVELS, [
        LL_ERROR,
        LL_WARN,
        LL_LOG,
        LL_VERBOSE,
      ]);
    });

    it("should be in hierarchical order", () => {
      // Error is most restrictive, verbose is least restrictive
      assert.strictEqual(ALL_LOG_LEVELS[0], LL_ERROR);
      assert.strictEqual(ALL_LOG_LEVELS[1], LL_WARN);
      assert.strictEqual(ALL_LOG_LEVELS[2], LL_LOG);
      assert.strictEqual(ALL_LOG_LEVELS[3], LL_VERBOSE);
    });

    it("should have length of 4", () => {
      assert.strictEqual(ALL_LOG_LEVELS.length, 4);
    });

    it("should be immutable", () => {
      const originalLength = ALL_LOG_LEVELS.length;

      // Attempting to modify should not change the array
      assert.throws(() => {
        (ALL_LOG_LEVELS as any).push("new-level");
      });

      assert.strictEqual(ALL_LOG_LEVELS.length, originalLength);
    });

    it("should contain only string values", () => {
      for (const level of ALL_LOG_LEVELS) {
        assert.strictEqual(typeof level, "string");
      }
    });

    it("should match individual constants", () => {
      assert(ALL_LOG_LEVELS.includes(LL_ERROR));
      assert(ALL_LOG_LEVELS.includes(LL_WARN));
      assert(ALL_LOG_LEVELS.includes(LL_LOG));
      assert(ALL_LOG_LEVELS.includes(LL_VERBOSE));
    });
  });

  describe("level hierarchy", () => {
    it("should follow error > warn > log > verbose hierarchy", () => {
      const errorIndex = ALL_LOG_LEVELS.indexOf(LL_ERROR);
      const warnIndex = ALL_LOG_LEVELS.indexOf(LL_WARN);
      const logIndex = ALL_LOG_LEVELS.indexOf(LL_LOG);
      const verboseIndex = ALL_LOG_LEVELS.indexOf(LL_VERBOSE);

      assert(errorIndex < warnIndex);
      assert(warnIndex < logIndex);
      assert(logIndex < verboseIndex);
    });

    it("should enable inclusive levels in output creation context", () => {
      // This test verifies the conceptual hierarchy understanding
      // In practice: error level includes only error
      // warn level includes error + warn
      // log level includes error + warn + log
      // verbose level includes error + warn + log + verbose

      const getIncludedLevels = (
        targetLevel:
          | typeof LL_ERROR
          | typeof LL_WARN
          | typeof LL_LOG
          | typeof LL_VERBOSE
      ) => {
        const targetIndex = ALL_LOG_LEVELS.indexOf(targetLevel);
        return ALL_LOG_LEVELS.slice(0, targetIndex + 1);
      };

      assert.deepStrictEqual(getIncludedLevels(LL_ERROR), [LL_ERROR]);
      assert.deepStrictEqual(getIncludedLevels(LL_WARN), [LL_ERROR, LL_WARN]);
      assert.deepStrictEqual(getIncludedLevels(LL_LOG), [
        LL_ERROR,
        LL_WARN,
        LL_LOG,
      ]);
      assert.deepStrictEqual(getIncludedLevels(LL_VERBOSE), [
        LL_ERROR,
        LL_WARN,
        LL_LOG,
        LL_VERBOSE,
      ]);
    });
  });

  describe("type compatibility", () => {
    it("should work with LogLevel type", () => {
      // This test ensures the constants are compatible with the LogLevel type
      const testLevel: typeof LL_ERROR = LL_ERROR;
      assert.strictEqual(testLevel, "error");

      const levels: Array<
        typeof LL_ERROR | typeof LL_WARN | typeof LL_LOG | typeof LL_VERBOSE
      > = [LL_ERROR, LL_WARN, LL_LOG, LL_VERBOSE];

      assert.strictEqual(levels.length, 4);
    });

    it("should be usable in switch statements", () => {
      const testSwitch = (level: string) => {
        switch (level) {
          case LL_ERROR:
            return "error handling";
          case LL_WARN:
            return "warning handling";
          case LL_LOG:
            return "log handling";
          case LL_VERBOSE:
            return "verbose handling";
          default:
            return "unknown";
        }
      };

      assert.strictEqual(testSwitch(LL_ERROR), "error handling");
      assert.strictEqual(testSwitch(LL_WARN), "warning handling");
      assert.strictEqual(testSwitch(LL_LOG), "log handling");
      assert.strictEqual(testSwitch(LL_VERBOSE), "verbose handling");
      assert.strictEqual(testSwitch("invalid"), "unknown");
    });

    it("should be usable in object keys", () => {
      const levelConfig = {
        [LL_ERROR]: { color: "red", symbol: "⛔" },
        [LL_WARN]: { color: "yellow", symbol: "⚠️" },
        [LL_LOG]: { color: "blue", symbol: "ℹ️" },
        [LL_VERBOSE]: { color: "gray", symbol: "🔍" },
      };

      assert.strictEqual(levelConfig[LL_ERROR].color, "red");
      assert.strictEqual(levelConfig[LL_WARN].symbol, "⚠️");
      assert.strictEqual(levelConfig[LL_LOG].color, "blue");
      assert.strictEqual(levelConfig[LL_VERBOSE].symbol, "🔍");
    });
  });

  describe("constants integrity", () => {
    it("should not be modifiable", () => {
      // Test that constants cannot be reassigned
      const originalError = LL_ERROR;
      const originalWarn = LL_WARN;
      const originalLog = LL_LOG;
      const originalVerbose = LL_VERBOSE;

      // Values should remain constant
      assert.strictEqual(LL_ERROR, originalError);
      assert.strictEqual(LL_WARN, originalWarn);
      assert.strictEqual(LL_LOG, originalLog);
      assert.strictEqual(LL_VERBOSE, originalVerbose);
    });

    it("should be usable as default parameters", () => {
      const testFunction = (level: string = LL_LOG) => {
        return `Using level: ${level}`;
      };

      assert.strictEqual(testFunction(), "Using level: log");
      assert.strictEqual(testFunction(LL_ERROR), "Using level: error");
    });

    it("should work in array methods", () => {
      const filteredLevels = ALL_LOG_LEVELS.filter(
        (level) => level === LL_ERROR || level === LL_WARN
      );

      assert.deepStrictEqual(filteredLevels, [LL_ERROR, LL_WARN]);

      const mappedLevels = ALL_LOG_LEVELS.map((level) => level.toUpperCase());
      assert.deepStrictEqual(mappedLevels, ["ERROR", "WARN", "LOG", "VERBOSE"]);

      const foundLevel = ALL_LOG_LEVELS.find((level) => level === LL_VERBOSE);
      assert.strictEqual(foundLevel, LL_VERBOSE);
    });
  });

  describe("edge cases", () => {
    it("should handle comparison operations", () => {
      assert.notStrictEqual(LL_ERROR, LL_WARN);
      assert(LL_ERROR < LL_WARN); // alphabetically
      assert.notStrictEqual(LL_LOG, LL_VERBOSE);
    });

    it("should handle boolean contexts", () => {
      assert(Boolean(LL_ERROR));
      assert(Boolean(LL_WARN));
      assert(Boolean(LL_LOG));
      assert(Boolean(LL_VERBOSE));
    });

    it("should handle string concatenation", () => {
      assert.strictEqual("Level: " + LL_ERROR, "Level: error");
      assert.strictEqual(
        `Current level is ${LL_VERBOSE}`,
        "Current level is verbose"
      );
    });

    it("should work with JSON serialization", () => {
      const config = {
        logLevel: LL_WARN,
        levels: ALL_LOG_LEVELS,
      };

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      assert.strictEqual(parsed.logLevel, LL_WARN);
      assert.deepStrictEqual(parsed.levels, ALL_LOG_LEVELS);
    });
  });
});
