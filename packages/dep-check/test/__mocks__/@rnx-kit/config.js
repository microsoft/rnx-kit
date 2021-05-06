const rnxKitConfig = jest.createMockFromModule("@rnx-kit/config");
const actualKitConfig = jest.requireActual("@rnx-kit/config");

let kitConfig = "";

rnxKitConfig.__setMockConfig = (config) => {
  kitConfig = config;
};

rnxKitConfig.getKitCapabilities = actualKitConfig.getKitCapabilities;
rnxKitConfig.getKitConfig = () => kitConfig;

module.exports = rnxKitConfig;
