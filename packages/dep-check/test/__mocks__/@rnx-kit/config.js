const rnxKitConfig = jest.createMockFromModule("@rnx-kit/config");

let kitConfig = "";

rnxKitConfig.__setMockConfig = (config) => {
  kitConfig = config;
};

rnxKitConfig.getKitConfig = () => kitConfig;

module.exports = rnxKitConfig;
