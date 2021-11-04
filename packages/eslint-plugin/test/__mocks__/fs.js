const fs = jest.createMockFromModule("fs");
const actualFs = jest.requireActual("fs");

let mocks = {};
fs.__setMocks = (content) => {
  mocks = content;
};

fs.readFileSync = (path, options) => {
  const content = mocks[path];
  return content ? content : actualFs.readFileSync(path, options);
};

fs.writeFile = actualFs.writeFile;

module.exports = fs;
