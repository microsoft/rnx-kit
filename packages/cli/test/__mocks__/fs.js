const fs = jest.createMockFromModule("fs");

const { vol } = require("memfs");

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.lstat = (...args) => Promise.resolve(vol.lstat(...args));
fs.lstatSync = (...args) => vol.lstatSync(...args);
fs.readFileSync = (...args) => vol.readFileSync(...args);
fs.stat = (...args) => Promise.resolve(vol.stat(...args));
fs.statSync = (...args) => vol.statSync(...args);

module.exports = fs;
