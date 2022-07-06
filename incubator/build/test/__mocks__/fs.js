const fs = jest.createMockFromModule("fs");

const { vol } = require("memfs");

/** @type {(newMockFiles: Record<string, string>) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.lstat = (...args) => Promise.resolve(vol.lstat(...args));
fs.stat = (...args) => Promise.resolve(vol.stat(...args));

module.exports = fs;
