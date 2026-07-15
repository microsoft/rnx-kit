/**
 * Classification produced by {@link getNextCharType} for one step through a
 * string. Used by higher-level formatters to decide how each step contributes
 * to visible width, styling state, and line structure.
 */
export type CharacterType = "sgr" | "control" | "line-break" | "other";

/**
 * How (and whether) a wrap algorithm may use this step as a line-break
 * boundary.
 *
 * - `"replace"`: the step itself is replaced by the line break. Used for
 *   characters that act as separators (e.g. ASCII space and tab) — they
 *   disappear at the boundary.
 * - `"after"`: a line break may be inserted immediately after this step,
 *   keeping the step on the upper line. Used for content characters that
 *   are nevertheless breakable, like CJK ideographs.
 * - `"none"`: no break opportunity at this step.
 */
export type BreakStrategy = "replace" | "after" | "none";

export type CharPosition = {
  /** the index of the character in the input string */
  index: number;
  /** the visible column of the character in the output */
  column: number;
};

export type ParsedCharType =
  | "sgr.start"
  | "sgr.end"
  | "control"
  | "linebreak"
  | "break.replace"
  | "break.after"
  | "other";

export type ParsedChar = CharPosition & {
  /**
   * The type of the character.
   */
  type: ParsedCharType;

  /**
   * The length of the character sequence in the input string.
   * - will be used to update the index on each step
   */
  length: number;

  /**
   * The visible width of the sequence in the output
   * - will be used to update the column on each step
   */
  width: number;
};

export type ParsedString = {
  /**
   * renderable text for the string, will be unchanged for single line strings
   */
  text: string;

  /**
   * The total visible width of the string in the output
   */
  width: number;

  /**
   * Only set if the string is multiline, in this case the width above will be for the widest line,
   * and the lines and widths arrays will contain the text and width of each line.
   */
  multiline?: {
    lines: string[];
    widths: number[];
  };
};

/** The canonical SGR reset sequence (turns off all attributes). */
export const SGR_RESET = "\x1b[0m";

const SEGMENTER = new Intl.Segmenter(undefined, { granularity: "grapheme" });

const COMBINING_MARK_RE = /^\p{M}/u;

// CSI: ESC [ params intermediates final-byte. SGR ends with "m".
// eslint-disable-next-line no-control-regex -- intentionally matches ANSI control characters
const CSI_RE = /\x1b\[([\x30-\x3f]*)[\x20-\x2f]*([\x40-\x7e])/y;
// OSC: ESC ] body terminator (BEL or ST). Body excludes ESC / BEL.
// eslint-disable-next-line no-control-regex -- intentionally matches ANSI control characters
const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/y;
// SGR reset detection: empty params, or all params are zero (e.g. "", "0", "0;0").
const SGR_RESET_PARAMS_RE = /^[0;]*$/;

/**
 * Parse a control character from the input string.
 * @param s The input string.
 * @param data The parsed character data to populate, index pointing at the position to test
 * @returns True if a control character was found, false otherwise.
 * @internal
 */
export function parseControlChar(s: string, data: ParsedChar): boolean {
  const current = data.index;
  const cp = s.charCodeAt(current);
  // if it isn't a control character, return false immediately
  if (cp !== 0x1b) {
    return false;
  }

  // by default set the data to a control character that takes up no visible width and is of length 1
  data.type = "control";
  data.width = 0;
  data.length = 1;

  // look for escape sequences, seeing if this is an SGR or another kind of control sequence
  CSI_RE.lastIndex = current;
  const csi = CSI_RE.exec(s);
  if (csi && csi.index === current) {
    data.length = csi[0].length;
    if (csi[2] === "m") {
      // this is an SGR, differentiate between reset and non-reset
      const isReset = SGR_RESET_PARAMS_RE.test(csi[1]);
      data.type = isReset ? "sgr.end" : "sgr.start";
    }
  } else {
    // otherwise check to see if the sequence is longer than a single character
    OSC_RE.lastIndex = current;
    const osc = OSC_RE.exec(s);
    if (osc && osc.index === current) {
      data.length = osc[0].length;
    }
  }

  return true;
}

/**
 * Parse an ASCII character from the input string.
 * @param s The input string.
 * @param data The parsed character data to populate, index pointing at the position to test
 * @param runningWidth The width of the line being parsed.
 * @param tabStop The tab stop to use for tab characters.
 * @returns True if an ASCII character was found and handled, false otherwise.
 * @internal
 */
export function parseAsciiChar(
  s: string,
  data: ParsedChar,
  tabStop = 8
): boolean {
  const current = data.index;
  const cp = s.charCodeAt(current);
  if (cp < 32 || cp === 127) {
    return false;
  }
  data.type = "other";
  data.length = 1;
  data.width = 1;
  // Handle tab characters
  if (cp === 0x09) {
    // line width has the current visible position so calculate the next tab stop
    data.width = tabStop - (data.column % tabStop);
    data.type = "break.replace";
  } else if (cp === 0x20) {
    data.type = "break.replace";
  } else if (cp === 0x0a || cp === 0x0d) {
    // handle CRLF as a single line break
    if (cp === 0x0d && s.charCodeAt(current + 1) === 0x0a) {
      data.length = 2;
    }
    data.width = 0;
    data.type = "linebreak";
  } else if (cp < 0x20 || cp > 0x7e) {
    // Non-printable ASCII character, fall through to more complex unicode handling in case of combination
    // characters.
    return false;
  }
  return true;
}

/**
 * Parse a complex character (e.g., emoji, CJK) from the input string.
 * @param s the input string
 * @param data the parsed character data to populate
 * @returns true unless the segment iterator is exhausted (end of string) or something went unexpectedly wrong
 * @internal
 */
export function parseComplexChar(s: string, data: ParsedChar): boolean {
  const current = data.index;

  // Point to the current position in the string and use Intl.Segmenter to step one grapheme.
  const iter = SEGMENTER.segment(s.slice(current))[Symbol.iterator]();
  const next = iter.next();
  const seg = !next.done && next.value.segment;

  if (!seg || seg.length === 0) {
    return false;
  }

  data.length = seg.length;
  data.width = 1;
  data.type = "other";

  const cp = seg.codePointAt(0)!;
  if (COMBINING_MARK_RE.test(seg) || isZeroWidthChar(cp)) {
    data.width = 0;
  } else if (isWideChar(cp)) {
    // wide characters like emoji or CJK can correctly have line breaks added after their positions
    data.width = 2;
    data.type = "break.after";
  }

  return true;
}

/**
 * Parse a character from the input string.
 * @param s the input string
 * @param data the parsed character data to populate
 * @param runningWidth the width of the line being parsed
 * @param tabStop the tab stop to use for tab characters
 * @returns true if a character was found and handled, false otherwise
 * @internal
 */
export function parseChar(s: string, data: ParsedChar, tabStop = 8): boolean {
  return (
    parseControlChar(s, data) ||
    parseAsciiChar(s, data, tabStop) ||
    parseComplexChar(s, data)
  );
}

function isZeroWidthChar(cp: number): boolean {
  if (cp <= 0xff) {
    // handle the ASCII range
    if ((cp < 0x20 && cp !== 0x09) || (cp >= 0x7f && cp < 0xa0)) {
      return true;
    }
  } else if (
    cp === 0x200b ||
    cp === 0x200c ||
    cp === 0x200d ||
    cp === 0x2060 ||
    cp === 0xfeff
  ) {
    return true;
  }
  return false;
}

/**
 * Determine if a character is wide (2 columns in width). This isn't a complete implementation of UAX #11, but
 * mirrors what most terminals do for typical text — we don't need full UAX #11 fidelity.
 * @param cp The code point to check.
 * @returns True if the character is wide, false otherwise.
 */
function isWideChar(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f000 && cp <= 0x1fffd) ||
    (cp >= 0x20000 && cp <= 0x2fffd) ||
    (cp >= 0x30000 && cp <= 0x3fffd)
  );
}

export type CharIteratorOptions = {
  /**
   * If `true`, the iterator will not modify the string. This will avoid tracking unnecessary state.
   */
  readonly?: boolean;

  /**
   * The maximum width of the line. If specified this will enable wrapping behavior.
   */
  maxWidth?: number;

  /**
   * The tab stop to use for tab characters.
   */
  tabStop?: number;
};

const INITIAL_CHAR_DATA: ParsedChar = {
  index: -1, // start at the beginning of the string
  length: 1, // default length of 1 character so stepping once brings index to 0
  width: 0, // initial width of 0
  column: 0, // initial column of 0
  type: "other", // default type of "other"
};

function copyCharData(src: ParsedChar, dst: ParsedChar) {
  dst.index = src.index;
  dst.length = src.length;
  dst.width = src.width;
  dst.column = src.column;
  dst.type = src.type;
}

const SGR_EMPTY = "";

type Breakpoint = {
  index: number;
  length: number;
  width: number;
  lineWidth: number;
  after?: boolean;
};
function initBreakpoint(): Breakpoint {
  return { index: -1, length: 0, width: 0, lineWidth: 0 };
}

export class StringParser implements ParsedChar {
  private _base: string;

  /** ParsedChar values */
  index = INITIAL_CHAR_DATA.index;
  length = INITIAL_CHAR_DATA.length;
  width = INITIAL_CHAR_DATA.width;
  column = INITIAL_CHAR_DATA.column;
  type: ParsedCharType = INITIAL_CHAR_DATA.type;

  private _maxWidth?: number;
  private _readonly?: boolean;
  private _tabStop?: number;
  private _multi: { lines: string[]; widths: number[] } | undefined;
  private _lineStart = 0;
  private _linePrefix?: string;
  private _sgr?: string;
  private _maxColumn = 0;

  private _breakpoint: ParsedChar | undefined;

  constructor(s: string, options?: CharIteratorOptions) {
    this._base = s;
    this.setOptions(options);
  }

  /**
   * Attach a new string to the parser and reset everything
   * @param s new string to parse
   * @param options options for the parser behavior
   */
  attach(s: string, options?: CharIteratorOptions) {
    // set the base string
    this._base = s;

    // set the options
    this.setOptions(options);

    // reset the iterator
    this.reset();
  }

  reset() {
    copyCharData(INITIAL_CHAR_DATA, this);
    this._lineStart = 0;
    this._maxColumn = 0;
    this._linePrefix = undefined;
    this._sgr = this._readonly ? undefined : SGR_EMPTY;
    if (this._breakpoint) {
      copyCharData(INITIAL_CHAR_DATA, this._breakpoint);
    }
    if (this._multi && this._multi.lines.length > 0) {
      this._multi.lines = [];
      this._multi.widths = [];
    }
  }

  private setOptions(options?: CharIteratorOptions) {
    this._maxWidth = options?.maxWidth;
    this._readonly = options?.readonly;
    this._tabStop = options?.tabStop;
  }

  private recordBreakpoint() {
    this._breakpoint ??= {} as ParsedChar;
    copyCharData(this, this._breakpoint);
  }

  private recordLine(start: number, end: number, lineWidth: number) {
    if (this._readonly) {
      if (lineWidth > this._maxColumn) {
        this._maxColumn = lineWidth;
      }
      this.column = 0;
    } else {
      const multi = (this._multi ??= { lines: [], widths: [] });
      const line = this._base.slice(start, end);
      if (this._linePrefix || this._sgr) {
        multi.lines.push(
          `${this._linePrefix ?? SGR_EMPTY}${line}${this._sgr ?? SGR_RESET}`
        );
      } else {
        multi.lines.push(line);
      }
      multi.widths.push(lineWidth);
      this._linePrefix = this._sgr;
    }
  }

  advance(): boolean {
    // Advance to the next character, default the length and width to 1
    this.index += this.length;
    this.column += this.width;
    if (this.column > this._maxColumn) {
      this._maxColumn = this.column;
    }
    if (parseChar(this._base, this, this._tabStop)) {
      const index = this.index;
      const length = this.length;
      const type = this.type;
      // If the current character is a line break, record it
      if (type === "linebreak") {
        this.recordLine(this._lineStart, index, this.column);
        this._lineStart = index + length;
      } else if (!this._readonly) {
        // otherwise handle the edit mode cases
        if (
          this._maxWidth &&
          (type === "break.after" || type === "break.replace")
        ) {
          // record a potential breakpoint if we are wrapping text
          this.recordBreakpoint();
        } else if (type === "sgr.start") {
          // add SGR to the current sequence
          this._sgr ??= SGR_EMPTY;
          this._sgr += this._base.slice(index, index + length);
        } else if (type === "sgr.end") {
          // reset the SGR sequence
          this._sgr = SGR_EMPTY;
        }
      }
      return true;
    }
    return false;
  }

  parse(): ParsedString {
    const maxColumn = !this._readonly && this._maxColumn;
    while (this.advance) {
      
    }
  }
}

/**
 * Advance `state` to the next "character" in the string, classifying it as an
 * SGR open/close, other ANSI control, line-break, or visible grapheme. The
 * `width` field is the visible-column contribution of the step (always 0 for
 * controls and line-breaks, otherwise the result of {@link graphemeWidth}).
 *
 * @param s the string being scanned
 * @param state the previous scan position; mutated in place to the new position
 * @param sgrState optional accumulator; when supplied, every SGR step is
 * applied to it via {@link applySgrSequence}, giving the caller a live view of
 * the current styling without manual bookkeeping
 * @returns `true` when a step was taken, `false` when the end of the string
 * has been reached (and `state` has not been mutated)
 * @remarks This is a low-level utility used by the formatters to process strings
 * with complex character types. It is not intended to be used directly by
 * external code.
 */
export function getNextCharType(
  s: string,
  state: CharData,
  sgrState?: SgrState
): boolean {
  const i = state.index;
  if (i >= s.length) {
    return false;
  }

  const ch = s.charCodeAt(i);

  // Fast path: printable ASCII plus tab. The bulk of typical input lands
  // here and skips both regex matching and Intl.Segmenter setup. A trailing
  // combining mark on an ASCII base is still handled correctly on the next
  // step (Segmenter reports it as a zero-width grapheme).
  if (ch === 0x09) {
    // Tab — treated as zero-width (terminals expand variably) but breakable.
    return advance(state, "other", 1, 0, "replace");
  }
  if (ch === 0x20) {
    return advance(state, "other", 1, 1, "replace");
  }
  if (ch >= 0x21 && ch < 0x7f) {
    return advance(state, "other", 1, 1);
  }

  if (ch === 0x1b) {
    CSI_RE.lastIndex = i;
    const csi = CSI_RE.exec(s);
    if (csi && csi.index === i) {
      const length = csi[0].length;
      if (csi[2] === "m") {
        const isReset = SGR_RESET_PARAMS_RE.test(csi[1]);
        if (sgrState) {
          if (isReset) sgrState.opens = "";
          else sgrState.opens += csi[0];
        }
        return advance(state, isReset ? "sgr-close" : "sgr-open", length, 0);
      } else {
        return advance(state, "control", length, 0);
      }
    }

    OSC_RE.lastIndex = i;
    const osc = OSC_RE.exec(s);
    if (osc && osc.index === i) {
      return advance(state, "control", osc[0].length, 0);
    }

    // Lone ESC or unrecognized escape — consume one byte as a control
    return advance(state, "control", 1, 0);
  }

  if (ch === 0x0a) {
    return advance(state, "line-break", 1, 0);
  }
  if (ch === 0x0d) {
    const length = s.charCodeAt(i + 1) === 0x0a ? 2 : 1;
    return advance(state, "line-break", length, 0);
  }

  // Non-ASCII: use Intl.Segmenter to step one grapheme.
  const iter = SEGMENTER.segment(s.slice(i))[Symbol.iterator]();
  const next = iter.next();
  if (next.done) {
    return false;
  }
  const seg = next.value.segment;
  const width = graphemeWidth(seg);
  // Wide graphemes (CJK ideographs, emoji, Hangul syllables, …) act as
  // break points on their trailing edge, so a wrap can split between any
  // two of them — crucial for CJK text, which lacks inter-word whitespace.
  return advance(
    state,
    "other",
    seg.length,
    width,
    width === 2 ? "after" : "none"
  );
}
