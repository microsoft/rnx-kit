const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

// Under normal circumstances, this extra copy of 'fbjs' should not be installed.
const extraFbjs = "/packages/test-app/node_modules/fbjs/package.json";

fs.readFileSync = (path, ...args) => {
  if (path.replace(/\\/g, "/").endsWith(extraFbjs)) {
    return JSON.stringify({ name: "fbjs", version: "3.0.0" });
  } else {
    return actualFs.readFileSync(path, ...args);
  }
};

fs.statSync = actualFs.statSync; // Used by 'pkg-dir'

module.exports = fs;
