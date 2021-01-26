if (process.env.yarnFast !== "true" && process.stdout.isTTY) {
  const openRed = `\u001B[91m`;
  const closeRed = `\u001B[39m`;
  const openBold = `\u001B[1m`;
  const closeBold = `\u001B[22m`;

  console.error();
  console.error(`${openRed}${openBold}`);
  console.error(
    "Hi! In order to increase install speed, the rnx-kit uses a yarn fork. Please run `yarn fast` to install dependencies."
  );
  console.error(
    "See https://github.com/VincentBailly/yarn for technical details."
  );
  console.error(`${closeBold}${closeRed}`);
  console.error();

  process.exit(1);
}
