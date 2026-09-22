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
  /[\p{Mark}\p{Default_Ignorable_Code_Point}\u1160-\u11FF\uD7B0-\uD7FF]/uy;

const EMOJI = /\p{Emoji}/uy;
const EMOJI_PRESENTATION = /\p{Emoji_Presentation}/uy;
const EMOJI_MODIFIER_BASE = /\p{Emoji_Modifier_Base}/uy;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/uy;

// Wide/fullwidth ranges not already covered by zero-width or emoji handling:
// https://www.unicode.org/Public/16.0.0/ucd/EastAsianWidth.txt
const WIDE_RANGES: readonly (readonly [number, number])[] = [
  [0x1100, 0x115e],
  [0x2329, 0x232a],
  [0x2630, 0x2637],
  [0x268a, 0x268f],
  [0x2e80, 0x2e99],
  [0x2e9b, 0x2ef3],
  [0x2f00, 0x2fd5],
  [0x2ff0, 0x3029],
  [0x3030, 0x303e],
  [0x3041, 0x3096],
  [0x309b, 0x30ff],
  [0x3105, 0x312f],
  [0x3131, 0x3163],
  [0x3165, 0x318e],
  [0x3190, 0x31e5],
  [0x31ef, 0x321e],
  [0x3220, 0x3247],
  [0x3250, 0xa48c],
  [0xa490, 0xa4c6],
  [0xa960, 0xa97c],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe52],
  [0xfe54, 0xfe66],
  [0xfe68, 0xfe6b],
  [0xff01, 0xff60],
  [0xffe0, 0xffe6],
  [0x16fe0, 0x16fe3],
  [0x17000, 0x187f7],
  [0x18800, 0x18cd5],
  [0x18cff, 0x18d08],
  [0x1aff0, 0x1aff3],
  [0x1aff5, 0x1affb],
  [0x1affd, 0x1affe],
  [0x1b000, 0x1b122],
  [0x1b132, 0x1b132],
  [0x1b150, 0x1b152],
  [0x1b155, 0x1b155],
  [0x1b164, 0x1b167],
  [0x1b170, 0x1b2fb],
  [0x1d300, 0x1d356],
  [0x1d360, 0x1d376],
  [0x1f200, 0x1f200],
  [0x1f202, 0x1f202],
  [0x1f210, 0x1f219],
  [0x1f21b, 0x1f22e],
  [0x1f230, 0x1f231],
  [0x1f237, 0x1f237],
  [0x1f23b, 0x1f23b],
  [0x1f240, 0x1f248],
  [0x1f260, 0x1f265],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

type ControlSequence = "escape" | "intermediate" | "csi" | "osc" | "string";

/**
 * Get the text metrics for the given text. Undefined text will be treated as an empty string.
 * Array entries and embedded LF/CRLF separators contribute separate lines, including empty
 * and trailing lines. An empty array has no lines. Control characters (including tabs) and
 * ANSI escape sequences do not contribute width; cursor movement is not simulated.
 * Scans the original strings without splitting, stripping, or constructing substrings.
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
    // Keep cluster state across escapes so styling cannot change its width.
    let clusterWidth = 0;
    let previous = -1;
    let previousIndex = -1;
    let pictographic = false;
    let join = false;

    for (let index = 0; index < value.length; ) {
      const codePoint = value.codePointAt(index)!;
      const next = index + (codePoint > 0xffff ? 2 : 1);

      if (codePoint === 0x0a) {
        width = Math.max(width, lineWidth);
        lineWidth = 0;
        lineCount++;
        clusterWidth = 0;
        previous = -1;
        previousIndex = -1;
        pictographic = false;
        join = false;
        index = next;
        continue;
      }

      if (codePoint === 0x18 || codePoint === 0x1a) {
        control = undefined;
        index = next;
        continue;
      }

      if (control === "osc" || control === "string") {
        if (codePoint === 0x9c || (control === "osc" && codePoint === 0x07)) {
          control = undefined;
        } else if (codePoint === 0x1b && value.charCodeAt(next) === 0x5c) {
          control = undefined;
          index = next + 1;
          continue;
        }
        index = next;
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
            index = next;
            continue;
          }
        } else if (control === "intermediate" || control === "csi") {
          if (codePoint >= (control === "csi" ? 0x40 : 0x30)) {
            control = undefined;
          }
          if (codePoint <= 0x7e) {
            index = next;
            continue;
          }
        }

        let characterWidth = 1;
        let nextPictographic = false;
        if (codePoint >= 0x80) {
          if (testRegExpAt(ZERO_WIDTH, value, index)) {
            if (codePoint === 0x200d) {
              join = pictographic;
              pictographic = false;
              previous = -1;
              previousIndex = -1;
            } else {
              const emojiPresentation =
                codePoint === 0xfe0f &&
                pictographic &&
                previousIndex >= 0 &&
                testRegExpAt(EMOJI, value, previousIndex);
              const keycap =
                codePoint === 0x20e3 &&
                (previous === 0x23 ||
                  previous === 0x2a ||
                  (previous >= 0x30 && previous <= 0x39));
              if (emojiPresentation || keycap) {
                lineWidth += 2 - clusterWidth;
                clusterWidth = 2;
              }
            }
            index = next;
            continue;
          }

          if (
            codePoint >= 0x1f3fb &&
            codePoint <= 0x1f3ff &&
            previousIndex >= 0
          ) {
            if (testRegExpAt(EMOJI_MODIFIER_BASE, value, previousIndex)) {
              lineWidth += 2 - clusterWidth;
              clusterWidth = 2;
              previous = codePoint;
              previousIndex = index;
              index = next;
              continue;
            }
          }

          nextPictographic = testRegExpAt(PICTOGRAPHIC, value, index);
          const regionalIndicator =
            codePoint >= 0x1f1e6 && codePoint <= 0x1f1ff;
          if (
            (!regionalIndicator &&
              testRegExpAt(EMOJI_PRESENTATION, value, index)) ||
            isWide(codePoint)
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
        previous = codePoint;
        previousIndex = index;
        pictographic = nextPictographic;
        join = false;
      }

      index = next;
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

function isWide(codePoint: number): boolean {
  let low = 0;
  let high = WIDE_RANGES.length - 1;
  while (low <= high) {
    const middle = (low + high) >>> 1;
    const [start, end] = WIDE_RANGES[middle];
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

function testRegExpAt(regex: RegExp, value: string, index: number): boolean {
  regex.lastIndex = index;
  return regex.test(value);
}
