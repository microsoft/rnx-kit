import os from "os";

export function wrapAndIndent(
  spacesToIndent: number,
  columnsPerLine: number,
  s: string
): string {
  const indentText = " ".repeat(spacesToIndent);

  const words = s.split(" ");

  let text = indentText;
  let column = indentText.length;

  // Alawys print the first word on the first line. Pulling this out
  // of the loop makes the conditions for indenting and wrapping
  // simpler.
  const firstWord = words.shift();
  text += firstWord;
  column += firstWord?.length ?? 0;

  for (const word of words) {
    // Print a separator before printing the word. Use a space if the
    // word fits on the current line. Otherwise, wrap to the next line.
    if (column + 1 + word.length < columnsPerLine) {
      text += " ";
      column += 1;
    } else {
      text += os.EOL + indentText;
      column = indentText.length;
    }

    text += word;
    column += word.length;
  }

  return text;
}
