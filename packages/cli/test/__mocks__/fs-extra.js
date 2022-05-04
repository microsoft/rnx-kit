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
fs.ensureDir = (dir) => vol.promises.mkdir(dir, { recursive: true });
fs.pathExists = (...args) => Promise.resolve(vol.existsSync(...args));
fs.readFile = (...args) => vol.promises.readFile(...args);

module.exports = fs;
