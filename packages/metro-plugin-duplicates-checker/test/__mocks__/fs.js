const { vol } = require("memfs");

/**
 * @type {import("node:fs") & {
 *   __setMockFiles: (newMockFiles?: Record<string, string>) => void;
 *   __toJSON: ReturnType<typeof vol.toJSON()>;
 * }};
 */
const fs = {
  __setMockFiles: (files) => {
    vol.reset();
    vol.fromJSON(files);
  },
  __toJSON: () => vol.toJSON(),
  promises: vol.promises,
  existsSync: (...args) => vol.existsSync(...args),
  lstat: (...args) => vol.lstat(...args),
  lstatSync: (...args) => vol.lstatSync(...args),
  mkdirSync: (...args) => vol.mkdirSync(...args),
  readFileSync: (...args) => vol.readFileSync(...args),
  realpathSync: (...args) => vol.realpathSync(...args),
  stat: (...args) => vol.stat(...args),
  statSync: (...args) => vol.statSync(...args),
  writeFileSync: (...args) => vol.writeFileSync(...args),
};

fs.realpathSync.native = (...args) => vol.realpathSync(...args);

module.exports = fs;
