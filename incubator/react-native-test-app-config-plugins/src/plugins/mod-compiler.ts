import type {
  compileModsAsync as compileExpoModsAsync,
  withDefaultBaseMods as withExpoBaseMods,
} from "@expo/config-plugins";
import { BaseMods, evalModsAsync } from "@expo/config-plugins";
import { getAndroidModFileProviders } from "./withAndroidBaseMods";
import { getIosModFileProviders } from "./withIosBaseMods";

export const withDefaultBaseMods: typeof withExpoBaseMods = (config, props) => {
  config = BaseMods.withIosBaseMods(config, {
    ...props,
    providers: getIosModFileProviders(),
  });
  config = BaseMods.withAndroidBaseMods(config, {
    ...props,
    providers: getAndroidModFileProviders(),
  });
  return config;
};

export const compileModsAsync: typeof compileExpoModsAsync = (
  config,
  props
) => {
  if (props.introspect === true) {
    console.warn("`introspect` is not supported by react-native-test-app");
  }

  config = withDefaultBaseMods(config);
  return evalModsAsync(config, props);
};
