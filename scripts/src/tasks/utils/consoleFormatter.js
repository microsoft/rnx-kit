/**
 * Prints a red message to the console.
 * @param {string[]} lines
 */
function redMessage(lines) {
  const openRed = `\u001B[91m`;
  const closeRed = `\u001B[39m`;
  const openBold = `\u001B[1m`;
  const closeBold = `\u001B[22m`;

  console.error();
  console.error(`${openRed}${openBold}`);
  lines.forEach((line) => console.error(line));
  console.error(`${closeBold}${closeRed}`);
  console.error();
}

module.exports = { redMessage };
