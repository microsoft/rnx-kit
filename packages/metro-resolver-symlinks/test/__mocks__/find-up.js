const actualFindUp = jest.requireActual("find-up");
const fs = jest.requireActual("fs");
const path = jest.requireActual("path");

const findUp = jest.createMockFromModule("find-up");

findUp.sync = (query, options) => {
  return actualFindUp.sync((dir) => {
    if (path.basename(dir) === "__fixtures__") {
      return actualFindUp.stop;
    }

    const filename = path.resolve(dir, query);
    return fs.existsSync(filename) && query;
  }, options);
};

module.exports = findUp;
