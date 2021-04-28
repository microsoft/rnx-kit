const { aSourceMap, bSourceMap } = require("../mockSourceMaps");

const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

fs.readFileSync = (path, ...args) => {
  switch (path) {
    case "a":
      return JSON.stringify(aSourceMap);

    case "b":
      return JSON.stringify(bSourceMap);

    default:
      return actualFs.readFileSync(path, ...args);
  }
};

module.exports = fs;
