import { WIDE_CHAR_RANGES } from "./const.ts";

/**
 * Calculated text metrics for a formatted string
 */
export type TextMetrics = {
  /**
   * The number of lines in the formatted string.
   */
  lineCount: number;

  /**
   * The terminal width of the longest line in the formatted string. Note that this will
   * omit control characters while taking into account characters such as emoji and other wide
   * characters.
   */
  width: number;
};

/**
 * Formatted text, split into lines if necessary, with text metric information included.
 */
export type TextOutput = TextMetrics & {
  /**
   * The formatted text, split into lines if necessary.
   */
  lines: string[];
};

const ZERO_WIDTH =
  /[\p{Mark}\p{Default_Ignorable_Code_Point}\u1160-\u11FF\uD7B0-\uD7FF]/u;

const EMOJI = /\p{Emoji}/u;
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/u;
const EMOJI_MODIFIER_BASE = /\p{Emoji_Modifier_Base}/u;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

type ControlSequence = "escape" | "intermediate" | "csi" | "osc" | "string";

/**
 * Get the text metrics for the given text. Undefined text will be treated as an empty string.
 * Array entries and embedded LF/CRLF separators contribute separate lines, including empty
 * and trailing lines. An empty array has no lines. Control characters (including tabs) and
 * ANSI escape sequences do not contribute width; cursor movement is not simulated.
 * Iterates over Unicode code points without first splitting or stripping the input.
 * @param text The text to calculate metrics for. Can be a string or an array of strings.
 */
export function getTextMetrics(text?: string | string[]): TextMetrics {
  const count = Array.isArray(text) ? text.length : 1;
  let lineCount = count;
  let width = 0;
  let control: ControlSequence | undefined;

  for (let part = 0; part < count; part++) {
    const value = Array.isArray(text) ? text[part] : (text ?? "");
    let lineWidth = 0;
    let stringEscape = false;
    // Keep cluster state across escapes so styling cannot change its width.
    let clusterWidth = 0;
    let previous = "";
    let pictographic = false;
    let join = false;

    for (const character of value) {
      const codePoint = character.codePointAt(0)!;

      if (codePoint === 0x0a) {
        width = Math.max(width, lineWidth);
        lineWidth = 0;
        lineCount++;
        stringEscape = false;
        clusterWidth = 0;
        previous = "";
        pictographic = false;
        join = false;
        continue;
      }

      if (codePoint === 0x18 || codePoint === 0x1a) {
        control = undefined;
        stringEscape = false;
        continue;
      }

      if (control === "osc" || control === "string") {
        if (
          codePoint === 0x9c ||
          (control === "osc" && codePoint === 0x07) ||
          (stringEscape && codePoint === 0x5c)
        ) {
          control = undefined;
        }
        stringEscape = codePoint === 0x1b;
        continue;
      }

      if (codePoint === 0x1b) {
        control = "escape";
      } else if (codePoint === 0x9b) {
        control = "csi";
      } else if (codePoint === 0x9d) {
        control = "osc";
      } else if (
        codePoint === 0x90 ||
        codePoint === 0x98 ||
        codePoint === 0x9e ||
        codePoint === 0x9f
      ) {
        control = "string";
      } else if (codePoint >= 0x20 && (codePoint < 0x7f || codePoint > 0x9f)) {
        if (control === "escape") {
          switch (codePoint) {
            case 0x5b:
              control = "csi";
              break;
            case 0x5d:
              control = "osc";
              break;
            case 0x50:
            case 0x58:
            case 0x5e:
            case 0x5f:
              control = "string";
              break;
            default:
              control = codePoint < 0x30 ? "intermediate" : undefined;
          }
          if (codePoint <= 0x7e) {
            continue;
          }
        } else if (control === "intermediate" || control === "csi") {
          if (codePoint >= (control === "csi" ? 0x40 : 0x30)) {
            control = undefined;
          }
          if (codePoint <= 0x7e) {
            continue;
          }
        }

        let characterWidth = 1;
        let nextPictographic = false;
        if (codePoint >= 0x80) {
          if (ZERO_WIDTH.test(character)) {
            if (codePoint === 0x200d) {
              join = pictographic;
              pictographic = false;
              previous = "";
            } else {
              const emojiPresentation =
                codePoint === 0xfe0f && pictographic && EMOJI.test(previous);
              const keycap =
                codePoint === 0x20e3 &&
                (previous === "#" ||
                  previous === "*" ||
                  (previous >= "0" && previous <= "9"));
              if (emojiPresentation || keycap) {
                lineWidth += 2 - clusterWidth;
                clusterWidth = 2;
              }
            }
            continue;
          }

          if (
            codePoint >= 0x1f3fb &&
            codePoint <= 0x1f3ff &&
            EMOJI_MODIFIER_BASE.test(previous)
          ) {
            lineWidth += 2 - clusterWidth;
            clusterWidth = 2;
            previous = character;
            continue;
          }

          nextPictographic = PICTOGRAPHIC.test(character);
          const regionalIndicator =
            codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
          if (
            (!regionalIndicator && EMOJI_PRESENTATION.test(character)) ||
            isWideChar(codePoint)
          ) {
            characterWidth = 2;
          }
        }

        if (join && nextPictographic) {
          lineWidth += 2 - clusterWidth;
          clusterWidth = 2;
        } else {
          lineWidth += characterWidth;
          clusterWidth = characterWidth;
        }
        previous = character;
        pictographic = nextPictographic;
        join = false;
      }
    }

    width = Math.max(width, lineWidth);
  }

  return { lineCount, width };
}

/**
 * Get the formatted text output for the given text, including text metrics. Undefined text will
 * return a single line with an empty string. Splits LF/CRLF separators, including those inside
 * array entries, while preserving empty lines, ANSI styling, and all other text.
 * @param text The text to format and calculate metrics for. Can be a string or an array of strings.
 */
export function getTextOutput(text?: string | string[]): TextOutput {
  const metrics = getTextMetrics(text);
  const lines = Array.isArray(text)
    ? text.flatMap((value) => value.split(/\r?\n/))
    : (text ?? "").split(/\r?\n/);
  return { ...metrics, lines };
}

/**
 * @param codePoint The Unicode code point to check.
 * @returns True if the code point is a wide/fullwidth character, false otherwise.
 */
export function isWideChar(codePoint: number): boolean {
  let low = 0;
  let high = WIDE_CHAR_RANGES.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const [start, end] = WIDE_CHAR_RANGES[middle];
    if (codePoint < start) {
      high = middle - 1;
    } else if (codePoint > end) {
      low = middle + 1;
    } else {
      return true;
    }
  }
  return false;
}
