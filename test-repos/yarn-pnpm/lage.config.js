module.exports = {
  npmClient: "yarn",
  pipeline: {
    lint: [],
    build: ["^build", "lint"],
    test: ["lint", "build"],
  },
};
