const fs = require("@rnx-kit/metro-plugin-duplicates-checker/test/__mocks__/fs.js");
const fsActual = jest.requireActual("fs");

const readFileSync = fs.readFileSync;
fs.readFileSync = (p, options) => {
  return p.includes("__fixtures__")
    ? fsActual.readFileSync(p, options)
    : readFileSync(p, options);
};

module.exports = fs;
