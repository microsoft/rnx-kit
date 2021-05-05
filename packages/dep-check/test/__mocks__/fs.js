const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

let data = "";

fs.__setMockContent = (content) => {
  data = JSON.stringify(content, undefined, 2) + "\n";
};

fs.__setMockFileWriter = (writer) => {
  fs.writeFileSync = writer;
};

fs.readFileSync = (...args) => data || actualFs.readFileSync(...args);
fs.statSync = actualFs.statSync; // used by cosmiconfig
fs.writeFileSync = undefined;

module.exports = fs;
