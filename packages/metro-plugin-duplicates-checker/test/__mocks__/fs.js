const fs = jest.createMockFromModule("fs");

const { vol } = require("memfs");

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.existsSync = (...args) => vol.existsSync(...args);
fs.lstat = (...args) => vol.lstat(...args);
fs.lstatSync = (...args) => vol.lstatSync(...args);
fs.mkdirSync = (...args) => vol.mkdirSync(...args);
fs.readFileSync = (...args) => vol.readFileSync(...args);
fs.realpathSync = (...args) => vol.realpathSync(...args);
fs.realpathSync.native = (...args) => vol.realpathSync(...args);
fs.stat = (...args) => vol.stat(...args);
fs.statSync = (...args) => vol.statSync(...args);
fs.writeFileSync = (...args) => vol.writeFileSync(...args);

fs.promises = vol.promises;

module.exports = fs;
