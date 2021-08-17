const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

// Under normal circumstances, this extra copy of '@react-native/polyfills'
// should not be installed.
const extraPolyfills =
  "/packages/test-app/node_modules/@react-native/polyfills";

fs.readFileSync = actualFs.readFileSync;

fs.realpathSync = actualFs.realpathSync;
const actualRealpathSyncNative = actualFs.realpathSync.native;
fs.realpathSync.native = (path, ...args) => {
  if (path.replace(/\\/g, "/").endsWith(extraPolyfills)) {
    return path;
  } else {
    return actualRealpathSyncNative(path, ...args);
  }
};

fs.statSync = actualFs.statSync; // Used by 'pkg-dir'

module.exports = fs;
