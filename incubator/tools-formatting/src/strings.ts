import {
  type BreakStrategy,
  type CharacterType,
  type SgrState,
  SGR_RESET,
  applySgrSequence,
  createScanState,
  createSgrState,
  getNextCharType,
  isSgrStateEmpty,
  renderSgrState,
} from "./characters.ts";
import type { ParsedString } from "./types.ts";

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
  const state = createScanState();
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
  let prefixEmitted = false;
  let prevIndex = 0;
  const state = createScanState();
  const sgrState = createSgrState();

  while (getNextCharType(s, state)) {
    const charStart = col;

    // Stop before mutating any state — an SGR sequence sitting at or past
    // endCol must not contribute to the trailing reset.
    if (charStart >= endCol) {
      break;
    }

    const inWindow = charStart >= startCol;
    const isSgr =
      state.charType === "sgr-open" || state.charType === "sgr-close";
    // Only slice when raw is actually consumed: SGR steps need it to update
    // sgrState, in-window steps emit it. Pre-window non-SGR steps skip.
    const raw = isSgr || inWindow ? s.slice(prevIndex, state.index) : "";

    // Snapshot the opens that were active strictly before this step — used
    // as the prefix if this is the first in-window step. Cheap because
    // sgrState.opens is a primitive string.
    const opensBefore = sgrState.opens;
    if (isSgr) applySgrSequence(sgrState, raw);

    if (inWindow) {
      if (!prefixEmitted) {
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

  if (prefixEmitted && !isSgrStateEmpty(sgrState)) {
    result += SGR_RESET;
  }
  return result;
}

function finalizeParsedString(result: ParsedString): ParsedString {
  if (result.multiline) {
    let maxWidth = 0;
    for (const w of result.multiline.widths) {
      if (w > maxWidth) maxWidth = w;
    }
    result.width = maxWidth;
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
  const result: ParsedString = { text, width: 0 };
  if (text.length === 0) {
    return result;
  }

  let lineWidth = 0;
  // Allocated lazily on the first line break — single-line inputs never
  // allocate these arrays, and the per-token concat into `lineBuf` only
  // happens for the second line onward.
  let multi: ParsedString["multiline"] = undefined;
  let lineBuf = "";
  let prevIndex = 0;
  const state = createScanState();
  const sgrState = createSgrState();

  while (getNextCharType(text, state, sgrState)) {
    if (state.charType === "line-break") {
      if (!multi) {
        // First line break: reconstruct the first line from the raw input
        // (avoiding the per-token concat that would otherwise be wasted on
        // single-line inputs) and lazily initialize the arrays.
        let firstLine = text.slice(0, prevIndex);
        if (!isSgrStateEmpty(sgrState)) firstLine += SGR_RESET;
        multi = result.multiline = { lines: [firstLine], widths: [lineWidth] };
      } else {
        if (!isSgrStateEmpty(sgrState)) lineBuf += SGR_RESET;
        multi.lines.push(lineBuf);
        multi.widths.push(lineWidth);
      }
      lineBuf = renderSgrState(sgrState);
      lineWidth = 0;
    } else {
      if (multi) {
        lineBuf += text.slice(prevIndex, state.index);
      }
      if (state.charType === "other") {
        lineWidth += state.width;
      }
    }
    prevIndex = state.index;
  }

  if (!multi) {
    result.width = lineWidth;
    return result;
  }

  if (!isSgrStateEmpty(sgrState)) lineBuf += SGR_RESET;
  multi.lines.push(lineBuf);
  multi.widths.push(lineWidth);

  return finalizeParsedString(result);
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
  breakStrategy: BreakStrategy;
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
  // line with no embedded breaks, this stays undefined and the result has
  // just {text, width}.
  let multi: { lines: string[]; widths: number[] } | undefined;
  let outMaxWidth = 0;
  let lineTokens: WrapToken[] = [];
  let lineWidth = 0;
  // SGR state at the start of the current line. Replayed through buffered
  // tokens at emit time so a soft-break split doesn't desync from the state
  // of tokens that get carried into the next line's buffer.
  let lineStartSgr = createSgrState();
  let prevIndex = 0;
  const state = createScanState();

  const emitLine = () => {
    const endSgr: SgrState = { ...lineStartSgr };
    let str = renderSgrState(lineStartSgr);
    for (const tok of lineTokens) {
      str += tok.raw;
      if (tok.charType === "sgr-open" || tok.charType === "sgr-close") {
        applySgrSequence(endSgr, tok.raw);
      }
    }
    if (!isSgrStateEmpty(endSgr)) str += SGR_RESET;
    if (!multi) {
      multi = { lines: [], widths: [] };
    }
    multi.lines.push(str);
    multi.widths.push(lineWidth);
    if (lineWidth > outMaxWidth) outMaxWidth = lineWidth;
    lineTokens = [];
    lineWidth = 0;
    lineStartSgr = endSgr;
  };

  while (getNextCharType(text, state)) {
    const raw = text.slice(prevIndex, state.index);
    const tok: WrapToken = {
      raw,
      width: state.charType === "other" ? state.width : 0,
      charType: state.charType,
      breakStrategy: state.breakStrategy,
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

    // Overflow. A "replace"-strategy token at the boundary (typically an
    // ASCII space) is consumed by the wrap — emit the current line and drop
    // the token. Other overflowing tokens (visible content, including CJK
    // chars) need to fall through to the backtrack so they end up on the
    // next line.
    if (tok.breakStrategy === "replace") {
      emitLine();
      continue;
    }

    // Try to backtrack to a break-point token in the last maxBacktrack
    // columns. `rightCol` tracks the column at the right edge of
    // `lineTokens[j..end-1]` as `j` decreases — so at the moment we find a
    // break point, `rightCol` is exactly the visible width of tokens
    // strictly before the break point.
    let breakIdx = -1;
    let rightCol = lineWidth;
    for (let j = lineTokens.length - 1; j >= 0; j--) {
      const lt = lineTokens[j];
      rightCol -= lt.width;
      if (lineWidth - rightCol > maxBacktrack) break;
      if (lt.breakStrategy !== "none") {
        breakIdx = j;
        break;
      }
    }

    if (breakIdx >= 0) {
      const breakPoint = lineTokens[breakIdx];
      // "replace": the break-point token is the boundary itself, so the
      // head ends BEFORE it and the token is dropped.
      // "after": the break sits to the right of the token, so the head
      // ends WITH it.
      const dropBreak = breakPoint.breakStrategy === "replace";
      const headEnd = dropBreak ? breakIdx : breakIdx + 1;
      const headWidth = dropBreak ? rightCol : rightCol + breakPoint.width;
      const tail = lineTokens.slice(breakIdx + 1);
      const tailWidth = lineWidth - rightCol - breakPoint.width;
      lineTokens.length = headEnd;
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

  if (!multi) {
    // No emitLine call happened — the input had no line breaks and never
    // exceeded maxWidth, so the original string is also the result.
    return { text, width: lineWidth };
  }

  emitLine();
  return {
    text,
    width: outMaxWidth,
    multiline: multi,
  };
}

/**
 * Total cumulative visible columns across all lines (used internally by
 * {@link sliceByVisibleWidth} to resolve negative indices). Distinct from
 * {@link visibleWidth}, which returns the widest single line.
 */
function totalVisibleColumns(s: string): number {
  let total = 0;
  const state = createScanState();
  while (getNextCharType(s, state)) {
    if (state.charType === "other") {
      total += state.width;
    }
  }
  return total;
}
