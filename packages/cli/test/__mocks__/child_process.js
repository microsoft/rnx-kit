const child_process = jest.createMockFromModule("child_process");

child_process.spawnSync(() => undefined);

module.exports = child_process;
