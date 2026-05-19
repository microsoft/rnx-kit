import {
  type CharacterType,
  type ScanState,
  SGR_RESET,
  getNextCharType,
} from "./characters.ts";
import type { ParsedString, MultilineString } from "./types.ts";

/**
 * Get the visible width of a string, accounting for ANSI escape sequences,
 * wide characters (CJK, emoji), and line breaks. For multi-line strings this
 * returns the width of the widest line, not the cumulative width.
 *
 * @param s the string to measure
 * @returns the visible width of the widest line in `s`
 */
export function visibleWidth(s: string): number {
  if (s.length === 0) {
    return 0;
  }
  let lineMax = 0;
  let width = 0;
  const state: ScanState = { index: 0, width: 0, charType: "other" };
  while (getNextCharType(s, state)) {
    if (state.charType === "line-break") {
      if (width > lineMax) lineMax = width;
      width = 0;
    } else if (state.charType === "other") {
      width += state.width;
    }
    // sgr-open / sgr-close / control contribute nothing
  }
  return Math.max(lineMax, width);
}

/**
 * Type assertion helper to check if a ParsedString is multiline
 * @param s the ParsedString to check
 * @returns true if `s` is a MultilineString, false otherwise
 */
export function isMultilineString(s: ParsedString): s is MultilineString {
  return s.lines !== undefined && s.lineWidths !== undefined;
}

/**
 * Slice a string by visible width, matching `String.prototype.slice` semantics
 * (negative indices count from the end, `end <= start` returns `""`, etc.)
 * but operating on visible columns rather than UTF-16 code units. Any ANSI
 * SGR sequences active at the cut points are reapplied at the start of the
 * result and closed with `\x1b[0m` at the end so the slice renders correctly
 * in isolation. OSC hyperlinks and other non-SGR controls inside the window
 * pass through but are not reapplied across cuts.
 *
 * @param s the string to slice
 * @param start visible-column index of the first character to include
 * @param end visible-column index one past the last character to include
 */
export function sliceByVisibleWidth(
  s: string,
  start: number,
  end?: number
): string {
  if (s.length === 0) {
    return "";
  }

  // Only compute the total when we actually need it to resolve a negative
  // index. The common case (both bounds non-negative) skips a full pass —
  // out-of-range positive bounds naturally clamp via the walk itself.
  const needsTotal = start < 0 || (end !== undefined && end < 0);
  const total = needsTotal ? totalVisibleColumns(s) : 0;
  const startCol = start < 0 ? Math.max(0, total + start) : start;
  const endCol =
    end === undefined ? Infinity : end < 0 ? Math.max(0, total + end) : end;
  if (endCol <= startCol) {
    return "";
  }

  let result = "";
  let col = 0;
  let activeOpens = "";
  let prefixEmitted = false;
  let prevIndex = 0;
  const state: ScanState = { index: 0, width: 0, charType: "other" };

  while (getNextCharType(s, state)) {
    const charStart = col;

    // Stop before mutating any state — an SGR sequence sitting at or past
    // endCol must not contribute to the trailing reset.
    if (charStart >= endCol) {
      break;
    }

    const raw = s.slice(prevIndex, state.index);
    const opensBefore = activeOpens;
    if (state.charType === "sgr-open") {
      activeOpens += raw;
    } else if (state.charType === "sgr-close") {
      activeOpens = "";
    }

    if (charStart >= startCol) {
      if (!prefixEmitted) {
        // Reapply the opens that were active strictly before this step.
        result += opensBefore;
        prefixEmitted = true;
      }
      result += raw;
    }

    if (state.charType === "other") {
      col += state.width;
    }
    prevIndex = state.index;
  }

  if (prefixEmitted && activeOpens) {
    result += SGR_RESET;
  }
  return result;
}

/**
 * Parse a string into a {@link ParsedString}: its visible width and, when the
 * string actually spans multiple lines, the individual lines and their
 * widths. Single-line inputs return only `text` and `width` — the per-line
 * arrays are allocated lazily on the first line break.
 *
 * When `lines` is populated, each entry is self-contained: SGR sequences that
 * span the source line breaks are closed at the end of each line and
 * reopened at the start of the next, so `visibleWidth(lines[i])` always
 * equals `lineWidths[i]`.
 *
 * Selective SGR closes (e.g. `\x1b[22m` to turn off only bold) are treated as
 * opens for accumulation purposes; only a full reset (`\x1b[0m` or `\x1b[m`)
 * clears the active-styling state.
 *
 * @param text the string to parse
 */
export function parseMultilineString(text: string): ParsedString {
  if (text.length === 0) {
    return { text: "", width: 0 };
  }

  let lineWidth = 0;
  let maxWidth = 0;
  let activeOpens = "";
  // Allocated lazily on the first line break — single-line inputs never
  // allocate these arrays, and the per-token concat into `lineBuf` only
  // happens for the second line onward.
  let lines: string[] | undefined;
  let lineWidths: number[] | undefined;
  let lineBuf = "";
  let prevIndex = 0;
  const state: ScanState = { index: 0, width: 0, charType: "other" };

  while (getNextCharType(text, state)) {
    if (state.charType === "line-break") {
      if (!lines) {
        // First line break: reconstruct the first line from the raw input
        // (avoiding the per-token concat that would otherwise be wasted on
        // single-line inputs) and lazily initialize the arrays.
        let firstLine = text.slice(0, prevIndex);
        if (activeOpens) firstLine += SGR_RESET;
        lines = [firstLine];
        lineWidths = [lineWidth];
      } else {
        if (activeOpens) lineBuf += SGR_RESET;
        lines.push(lineBuf);
        lineWidths!.push(lineWidth);
      }
      if (lineWidth > maxWidth) maxWidth = lineWidth;
      lineBuf = activeOpens;
      lineWidth = 0;
    } else {
      const raw = text.slice(prevIndex, state.index);
      if (lines) {
        lineBuf += raw;
      }
      if (state.charType === "sgr-open") {
        activeOpens += raw;
      } else if (state.charType === "sgr-close") {
        activeOpens = "";
      } else if (state.charType === "other") {
        lineWidth += state.width;
      }
    }
    prevIndex = state.index;
  }
  if (lineWidth > maxWidth) maxWidth = lineWidth;

  if (!lines) {
    return { text, width: maxWidth };
  }

  if (activeOpens) lineBuf += SGR_RESET;
  lines.push(lineBuf);
  lineWidths!.push(lineWidth);

  return { text, width: maxWidth, lines, lineWidths };
}

export type WrapOptions = {
  /**
   * Maximum number of visible columns to scan backward looking for a word
   * boundary when a line would otherwise overflow. Defaults to 20% of
   * `maxWidth`, with a floor of 8 so very narrow columns still get some
   * backtrack room.
   */
  maxBacktrack?: number;
};

type WrapToken = {
  raw: string;
  width: number;
  charType: CharacterType;
  isWhitespace: boolean;
};

/**
 * Wrap a string at visible-column boundaries, breaking at whitespace where
 * possible and otherwise hard-cutting at `maxWidth`. Pre-existing line breaks
 * in the input are honored (each becomes a forced wrap). Each returned line
 * is self-contained — active SGRs are closed at the end of every line and
 * reopened at the start of the next — so callers can safely render or pad
 * each line independently.
 *
 * @param text the string to wrap
 * @param maxWidth the maximum visible width of each line
 * @param options optional wrapping options
 */
export function wrapStringByVisibleWidth(
  text: string,
  maxWidth: number,
  options: WrapOptions = {}
): ParsedString {
  if (text.length === 0) {
    return { text: "", width: 0 };
  }
  if (maxWidth <= 0) {
    return parseMultilineString(text);
  }
  const maxBacktrack =
    options.maxBacktrack ?? Math.max(8, Math.floor(maxWidth * 0.2));

  // Allocated lazily on the first emitLine call — when the input fits in one
  // line with no embedded breaks, these never get created and the result has
  // just {text, width}.
  let outLines: string[] | undefined;
  let outWidths: number[] | undefined;
  let outMaxWidth = 0;
  let lineTokens: WrapToken[] = [];
  let lineWidth = 0;
  let lineOpens = "";
  let prevIndex = 0;
  const state: ScanState = { index: 0, width: 0, charType: "other" };

  const emitLine = () => {
    let str = lineOpens;
    let endOpens = lineOpens;
    for (const tok of lineTokens) {
      str += tok.raw;
      if (tok.charType === "sgr-open") endOpens += tok.raw;
      else if (tok.charType === "sgr-close") endOpens = "";
    }
    if (endOpens) str += SGR_RESET;
    if (!outLines) {
      outLines = [];
      outWidths = [];
    }
    outLines.push(str);
    outWidths!.push(lineWidth);
    if (lineWidth > outMaxWidth) outMaxWidth = lineWidth;
    lineTokens = [];
    lineWidth = 0;
    lineOpens = endOpens;
  };

  while (getNextCharType(text, state)) {
    const raw = text.slice(prevIndex, state.index);
    const tok: WrapToken = {
      raw,
      width: state.charType === "other" ? state.width : 0,
      charType: state.charType,
      isWhitespace: state.charType === "other" && /^[ \t]$/.test(raw),
    };
    prevIndex = state.index;

    if (tok.charType === "line-break") {
      emitLine();
      continue;
    }
    if (tok.charType !== "other") {
      // sgr-open / sgr-close / control — zero-width, always include
      lineTokens.push(tok);
      continue;
    }
    if (lineWidth + tok.width <= maxWidth) {
      lineTokens.push(tok);
      lineWidth += tok.width;
      continue;
    }

    // Overflow.
    if (tok.isWhitespace) {
      emitLine();
      continue;
    }

    // Try to backtrack to a whitespace token in the last maxBacktrack columns.
    // `rightCol` tracks the column at the right edge of `lineTokens[j..end-1]`
    // as `j` decreases — so at the moment we find a whitespace, `rightCol` is
    // exactly the visible width of the head we'll emit (tokens 0..breakIdx-1).
    let breakIdx = -1;
    let rightCol = lineWidth;
    for (let j = lineTokens.length - 1; j >= 0; j--) {
      const lt = lineTokens[j];
      rightCol -= lt.width;
      if (lineWidth - rightCol > maxBacktrack) break;
      if (lt.isWhitespace) {
        breakIdx = j;
        break;
      }
    }

    if (breakIdx >= 0) {
      const headWidth = rightCol;
      const tail = lineTokens.slice(breakIdx + 1);
      const tailWidth = lineWidth - headWidth - lineTokens[breakIdx].width;
      lineTokens.length = breakIdx;
      lineWidth = headWidth;
      emitLine();
      lineTokens = tail;
      lineWidth = tailWidth;
    } else {
      emitLine();
    }
    lineTokens.push(tok);
    lineWidth += tok.width;
  }

  if (!outLines) {
    // No emitLine call happened — the input had no line breaks and never
    // exceeded maxWidth, so the original string is also the result.
    return { text, width: lineWidth };
  }

  emitLine();
  return { text, width: outMaxWidth, lines: outLines, lineWidths: outWidths! };
}

/**
 * Total cumulative visible columns across all lines (used internally by
 * {@link sliceByVisibleWidth} to resolve negative indices). Distinct from
 * {@link visibleWidth}, which returns the widest single line.
 */
function totalVisibleColumns(s: string): number {
  let total = 0;
  const state: ScanState = { index: 0, width: 0, charType: "other" };
  while (getNextCharType(s, state)) {
    if (state.charType === "other") {
      total += state.width;
    }
  }
  return total;
}
