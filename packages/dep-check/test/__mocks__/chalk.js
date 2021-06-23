const chalk = jest.createMockFromModule("chalk");

function passthrough(s) {
  return s;
}

chalk.dim = passthrough;
chalk.green = passthrough;
chalk.red = passthrough;
chalk.red.bold = passthrough;
chalk.yellow = passthrough;

module.exports = chalk;
