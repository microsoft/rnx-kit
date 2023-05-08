"use strict";

const fs = jest.createMockFromModule("fs-extra");

const { vol } = require("memfs");

/** @type {(newMockFiles: { [filename: string]: string }) => void} */
fs.__setMockFiles = (files) => {
  vol.reset();
  vol.fromJSON(files);
};

fs.__toJSON = () => vol.toJSON();

fs.copy = (...args) => vol.promises.copyFile(...args);
fs.ensureDirSync = (dir) => vol.mkdirSync(dir, { recursive: true });
fs.existsSync = (...args) => vol.existsSync(...args);
fs.writeFileSync = (...args) => vol.writeFileSync(...args);

module.exports = fs;
