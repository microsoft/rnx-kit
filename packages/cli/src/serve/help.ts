import type { MetroTerminal } from "@rnx-kit/metro-service";
import chalk from "chalk";

type HelpOptions = {
  hasDebugger: boolean;
};

type MenuItem = [string, string];

export function makeHelp(
  terminal: MetroTerminal["terminal"],
  { hasDebugger }: HelpOptions
): () => void {
  const openDebugger: MenuItem | null = hasDebugger
    ? ["J", "Open debugger"]
    : null;

  const menuItems: ("" | MenuItem)[] = [
    ["D", "Open developer menu"],
    ...(openDebugger ? [openDebugger] : []),
    ["Q", "Show bundler address QR code"],
    ["R", "Reload the app"],
    "",
    ["H", "Show this help message"],
    ["Ctrl-C", "Quit"],
  ];

  const margin = 4;
  const maxColumnWidth = (index: number) => {
    return (max: number, item: (typeof menuItems)[number]) => {
      if (!item) {
        return max;
      }

      const width = item[index].length;
      return width > max ? width : max;
    };
  };

  const keyWidth = menuItems.reduce(maxColumnWidth(0), 0);
  const labelWidth = menuItems.reduce(maxColumnWidth(1), 0);
  const separator = `┠${"─".repeat(labelWidth + keyWidth + margin + 1)}`;

  const dim = chalk.dim;
  const lines = menuItems.map((item) => {
    if (!item) {
      return separator;
    }

    const [key, label] = item;
    const labelPadding = labelWidth - label.length;
    const keyPadding = keyWidth - key.length;
    const padding = " ".repeat(labelPadding + keyPadding + margin);
    return `┃ ${dim(label)}${padding}${key}`;
  });
  lines.push("");

  const help = lines.join("\n");
  return () => terminal.log(help);
}
