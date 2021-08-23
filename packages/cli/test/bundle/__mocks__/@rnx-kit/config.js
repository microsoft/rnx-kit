const rnxKitConfig = jest.createMockFromModule("@rnx-kit/config");
const actualKitConfig = jest.requireActual("@rnx-kit/config");

let kitConfig = undefined;

rnxKitConfig.__setMockConfig = (config) => {
  kitConfig = config;
};

rnxKitConfig.getKitConfig = () => kitConfig;
rnxKitConfig.getBundleDefinition = actualKitConfig.getBundleDefinition;
rnxKitConfig.getBundlePlatformDefinition =
  actualKitConfig.getBundlePlatformDefinition;

module.exports = rnxKitConfig;
