/**
 * Classification produced by {@link getNextCharType} for one step through a
 * string. Used by higher-level formatters to decide how each step contributes
 * to visible width, styling state, and line structure.
 */
export type CharacterType =
  | "sgr-open"
  | "sgr-close"
  | "control"
  | "line-break"
  | "other";

/**
 * Mutable cursor passed to {@link getNextCharType}. Callers initialize
 * `index = 0` and re-read the fields after each call.
 */
export type ScanState = {
  /** UTF-16 code-unit index in the source string at which the next step begins. */
  index: number;
  /** Visible-column width contributed by the step just taken (0 for controls and line-breaks). */
  width: number;
  /** Classification of the step just taken. */
  charType: CharacterType;
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
 * Approximate the display width of a grapheme cluster, based on its first
 * code point. Returns 0 for combining marks and C0/C1 control characters,
 * 2 for East Asian Wide / Fullwidth and most emoji, and 1 otherwise. This
 * is a coarse but stable approximation that mirrors what most terminals do
 * for typical text — we don't need full UAX #11 fidelity.
 */
export function graphemeWidth(g: string): number {
  if (g.length === 0) return 0;
  if (COMBINING_MARK_RE.test(g)) return 0;
  const cp = g.codePointAt(0)!;
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if (
    cp === 0x200b ||
    cp === 0x200c ||
    cp === 0x200d ||
    cp === 0x2060 ||
    cp === 0xfeff
  ) {
    return 0;
  }
  if (
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
  ) {
    return 2;
  }
  return 1;
}

function advance(
  state: ScanState,
  charType: CharacterType,
  length: number,
  width?: number
): true {
  state.index += length;
  state.charType = charType;
  state.width = width ?? length;
  return true;
}

/**
 * Advance `state` to the next "character" in the string, classifying it as an
 * SGR open/close, other ANSI control, line-break, or visible grapheme. The
 * `width` field is the visible-column contribution of the step (always 0 for
 * controls and line-breaks, otherwise the result of {@link graphemeWidth}).
 *
 * @param s the string being scanned
 * @param state the previous scan position; mutated in place to the new position
 * @returns `true` when a step was taken, `false` when the end of the string
 * has been reached (and `state` has not been mutated)
 * @remarks This is a low-level utility used by the formatters to process strings
 * with complex character types. It is not intended to be used directly by
 * external code.
 */
export function getNextCharType(s: string, state: ScanState): boolean {
  const i = state.index;
  if (i >= s.length) {
    return false;
  }

  const ch = s.charCodeAt(i);

  // Fast path: printable ASCII. The bulk of typical input lands here and
  // skips both regex matching and Intl.Segmenter setup. A trailing combining
  // mark on an ASCII base is still handled correctly on the next step
  // (Segmenter reports it as a zero-width grapheme).
  if (ch >= 0x20 && ch < 0x7f) {
    return advance(state, "other", 1);
  }

  if (ch === 0x1b) {
    CSI_RE.lastIndex = i;
    const csi = CSI_RE.exec(s);
    if (csi && csi.index === i) {
      const length = csi[0].length;
      if (csi[2] === "m") {
        const charType = SGR_RESET_PARAMS_RE.test(csi[1])
          ? "sgr-close"
          : "sgr-open";
        return advance(state, charType, length, 0);
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
  return advance(state, "other", seg.length, graphemeWidth(seg));
}
