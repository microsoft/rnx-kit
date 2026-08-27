// Minimal stand-in for `jest-cli`, used to verify that `rnxTest` forwards the
// right arguments to Jest's `run` without actually running Jest.
const calls = [];
module.exports = {
  calls,
  run: (argv) => {
    calls.push(argv);
  },
};
