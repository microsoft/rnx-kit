const fs = jest.createMockFromModule("node:fs");

fs.existsSync = (p) => !p.includes("missing");

module.exports = fs;
