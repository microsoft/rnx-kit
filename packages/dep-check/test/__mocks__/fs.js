const fs = jest.createMockFromModule("fs");

let data = "";

fs.__setMockContent = (content) => {
  data = JSON.stringify(content, undefined, 2) + "\n";
};

fs.__setMockFileWriter = (writer) => {
  fs.writeFileSync = writer;
};

fs.readFileSync = () => data;
fs.writeFileSync = undefined;

module.exports = fs;
