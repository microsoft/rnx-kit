const fs = jest.createMockFromModule("fs");

const { vol } = require("memfs");

/** @type {(newMockFiles: Record<string, string>) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.lstat = (...args) => vol.lstat(...args);
fs.stat = (...args) => vol.stat(...args);

module.exports = fs;
