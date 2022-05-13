const child_process = jest.createMockFromModule("child_process");

child_process.spawnSync = () => ({ status: 0 });

module.exports = child_process;
