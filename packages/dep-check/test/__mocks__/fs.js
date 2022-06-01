const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

let data = "";

fs.__setMockContent = (content, space = 2) => {
  data = JSON.stringify(content, undefined, space) + "\n";
};

fs.__setMockFileWriter = (writer) => {
  fs.writeFileSync = writer;
};

fs.lstatSync = (...args) => actualFs.lstatSync(...args);
fs.readFileSync = (...args) => data || actualFs.readFileSync(...args);
fs.statSync = actualFs.statSync; // used by cosmiconfig
fs.writeFileSync = undefined;

module.exports = fs;
