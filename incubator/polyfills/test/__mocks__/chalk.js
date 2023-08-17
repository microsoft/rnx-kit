const chalk = jest.createMockFromModule("chalk");

function passthrough(s) {
  return s;
}

chalk.cyan = passthrough;
chalk.cyan.bold = passthrough;
chalk.red = passthrough;
chalk.red.bold = passthrough;
chalk.yellow = passthrough;
chalk.yellow.bold = passthrough;

module.exports = chalk;
