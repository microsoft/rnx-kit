// Both `internal` imports are used to verify that `metro-resolver-symlinks`
// resolves them correctly when `experimental_retryResolvingFromDisk` is
// enabled.
import {
  getReactNativeVersion,
  isBridgeless,
  isFabricInstance,
  isRemoteDebuggingAvailable,
} from "internal";
import { getHermesVersion } from "internal/hermes";
import type { PropsWithChildren } from "react";
import React, { useCallback, useState } from "react";
import type { NativeSyntheticEvent } from "react-native";
import {
  NativeModules,
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  useColorScheme,
} from "react-native";
// @ts-expect-error no type definitions available
import { version as coreVersion } from "react-native/Libraries/Core/ReactNativeVersion";
import { Header } from "react-native/Libraries/NewAppScreen";
// @ts-expect-error no type definitions available
import { isAsyncDebugging } from "react-native/Libraries/Utilities/DebugEnvironment";
import { Feature } from "./Feature";
import { Separator } from "./Separator";
import { useStyles } from "./styles";

type HomeProps = PropsWithChildren<{
  concurrentRoot?: boolean;
}>;

function isConcurrentReactEnabled(
  props: HomeProps,
  isFabric: boolean
): boolean {
  const { major, minor } = coreVersion;
  const version = major * 10000 + minor;
  // As of 0.74, it won't be possible to opt-out:
  // https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03
  return isFabric && (version >= 74 || props.concurrentRoot !== false);
}

function isOnOrOff(value: unknown): "Off" | "On" {
  return value ? "On" : "Off";
}

function setRemoteDebugging(value: boolean) {
  if (isRemoteDebuggingAvailable()) {
    NativeModules["DevSettings"].setIsDebuggingRemotely(value);
  }
}

function useIsFabricComponent() {
  const [isFabric, setIsFabric] = useState(isBridgeless());
  const setter = useCallback(
    ({ currentTarget }: NativeSyntheticEvent<unknown>) => {
      setIsFabric(isFabricInstance(currentTarget));
    },
    [setIsFabric]
  );
  return [isFabric, setter] as const;
}

function DevMenu(): React.ReactElement | null {
  const styles = useStyles();

  if (!isRemoteDebuggingAvailable()) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Feature value={isAsyncDebugging} onValueChange={setRemoteDebugging}>
        Remote Debugging
      </Feature>
    </View>
  );
}

export function Home(props: HomeProps): React.ReactElement<HomeProps> {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();
  const [isFabric, setIsFabric] = useIsFabricComponent();

  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onLayout={setIsFabric}
        style={styles.body}
      >
        <Header />
        <DevMenu />
        <View style={styles.group}>{props.children}</View>
        <View style={styles.group}>
          <Feature value={getReactNativeVersion()}>React Native</Feature>
          <Separator />
          <Feature value={isOnOrOff(getHermesVersion())}>Hermes</Feature>
          <Separator />
          <Feature value={isOnOrOff(isFabric)}>Fabric</Feature>
          <Separator />
          <Feature value={isOnOrOff(isConcurrentReactEnabled(props, isFabric))}>
            Concurrent React
          </Feature>
          <Separator />
          <Feature value={isOnOrOff(isBridgeless())}>Bridgeless</Feature>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
