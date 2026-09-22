module.exports = {
  test: {
    core: { name: "react-native", version: "0.70.0" },
    bundle: {
      name: "#meta",
      capabilities: ["loop", "missing", "target"],
    },
    loop: { name: "#meta", capabilities: ["bundle"] },
    target: { name: "target-package", version: "1.0.0" },
    constructor: { name: "target-package", version: "1.0.0" },
  },
};
