function findInfo(name) {
  const values = {
    package1: {
      path: "./foo/bar",
      version: "1.0.0",
    },
    package2: {
      path: "./foo/baz",
      version: "1.0.0",
    },
  };
  return values[name];
}

module.exports.default = findInfo;
