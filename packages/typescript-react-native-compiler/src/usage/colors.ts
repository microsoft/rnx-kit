export interface UsageColors {
  bold(s: string): string;

  blue(s: string): string;
  brightWhite(s: string): string;

  blueBackground(s: string): string;
}

export const enum UsageColorMode {
  None,
  Limited,
  Normal,
  Rich,
}

export function getUsageColorMode(): UsageColorMode {
  if (!process.stdout.isTTY || process.env["NO_COLOR"]) {
    return UsageColorMode.None;
  }

  const isWindows =
    !!process.env["OS"] &&
    process.env["OS"].toLowerCase().indexOf("windows") !== -1;
  const isWindowsTerminal = process.env["WT_SESSION"];
  const isVSCode =
    process.env["TERM_PROGRAM"] && process.env["TERM_PROGRAM"] === "vscode";
  if (isWindows && !isWindowsTerminal && !isVSCode) {
    return UsageColorMode.Limited;
  }

  if (
    process.env["COLORTERM"] === "truecolor" ||
    process.env["TERM"] === "xterm-256color"
  ) {
    return UsageColorMode.Rich;
  }

  return UsageColorMode.Normal;
}

export function createUsageColors(
  mode: UsageColorMode = getUsageColorMode()
): UsageColors {
  if (mode === UsageColorMode.None) {
    const nop = (s: string): string => {
      return s;
    };
    return {
      bold: nop,
      blue: nop,
      brightWhite: nop,
      blueBackground: nop,
    };
  }

  function bold(s: string): string {
    return "\u001B[1m" + s + "\u001B[22m";
  }

  function blue(s: string): string {
    if (mode === UsageColorMode.Limited) {
      return brightWhite(s);
    }
    return "\u001B[94m" + s + "\u001B[39m";
  }

  function brightWhite(s: string): string {
    return "\u001B[97m" + s + "\u001B[39m";
  }

  function blueBackground(s: string): string {
    if (mode === UsageColorMode.Rich) {
      return "\u001B[48;5;68m" + s + "\u001B[39;49m";
    } else {
      return "\u001B[44m" + s + "\u001B[39;49m";
    }
  }

  return {
    bold,
    blue,
    brightWhite,
    blueBackground,
  };
}
