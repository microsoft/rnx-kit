import { acquireTokenWithScopes } from "@rnx-kit/react-native-auth";
// Both `internal` imports are used to verify that `metro-resolver-symlinks`
// resolves them correctly when `experimental_retryResolvingFromDisk` is
// enabled.
import {
  getReactNativeVersion,
  getRemoteDebuggingAvailability,
} from "internal";
import { getHermesVersion } from "internal/hermes";
import React, { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Colors, Header } from "react-native/Libraries/NewAppScreen";
// @ts-expect-error no types for "react-native/Libraries/Utilities/DebugEnvironment"
import { isAsyncDebugging } from "react-native/Libraries/Utilities/DebugEnvironment";
import manifest from "../app.json";

type ButtonProps = {
  children: string;
  onPress: () => void;
};

type FeatureProps =
  | {
      children: string;
      value: string;
    }
  | {
      children: string;
      value: boolean;
      disabled?: boolean;
      onValueChange?: (value: boolean) => void;
    };

function isOnOrOff(value: unknown): "Off" | "On" {
  return value ? "On" : "Off";
}

function useStyles() {
  const colorScheme = useColorScheme();
  return useMemo(() => {
    const isDarkMode = colorScheme === "dark";

    const fontSize = 18;
    const groupBorderRadius = 8;
    const margin = 16;

    return StyleSheet.create({
      body: {
        backgroundColor: isDarkMode ? Colors.black : Colors.lighter,
        flex: 1,
      },
      buttonRipple: {
        color: isDarkMode ? Colors.dark : Colors.light,
      },
      group: {
        backgroundColor: isDarkMode ? Colors.darker : Colors.white,
        borderRadius: groupBorderRadius,
        margin,
      },
      groupItemContainer: {
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: margin,
      },
      groupItemLabel: {
        color: isDarkMode ? Colors.white : Colors.black,
        flex: 1,
        fontSize,
        marginVertical: 12,
      },
      groupItemValue: {
        color: isDarkMode ? Colors.light : Colors.dark,
        fontSize: fontSize,
      },
      separator: {
        backgroundColor: isDarkMode ? Colors.dark : Colors.light,
        height: StyleSheet.hairlineWidth,
        marginStart: margin,
      },
    });
  }, [colorScheme]);
}

function Button({ children, onPress }: ButtonProps) {
  const styles = useStyles();
  return (
    <Pressable
      android_ripple={styles.buttonRipple}
      style={styles.groupItemContainer}
      onPress={onPress}
    >
      <Text style={styles.groupItemLabel}>{children}</Text>
    </Pressable>
  );
}

function Feature({ children, value, ...props }: FeatureProps) {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{children}</Text>
      {typeof value === "boolean" ? (
        <Switch value={value} {...props} />
      ) : (
        <Text style={styles.groupItemValue}>{value}</Text>
      )}
    </View>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

function DevMenu() {
  const styles = useStyles();

  const isRemoteDebuggingAvailable = getRemoteDebuggingAvailability();
  const toggleRemoteDebugging = useCallback(
    (value: boolean) => {
      if (isRemoteDebuggingAvailable) {
        NativeModules["DevSettings"].setIsDebuggingRemotely(value);
      }
    },
    [isRemoteDebuggingAvailable]
  );

  if (!isRemoteDebuggingAvailable) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Feature value={isAsyncDebugging} onValueChange={toggleRemoteDebugging}>
        Remote Debugging
      </Feature>
    </View>
  );
}

export function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();

  const startAcquireToken = React.useCallback(async () => {
    try {
      const authConfig = manifest["react-native-test-app-msal"];
      const result = await acquireTokenWithScopes(
        authConfig.orgScopes,
        authConfig.userPrincipalName,
        "Organizational"
      );
      console.log(JSON.stringify(result, undefined, 2));
    } catch (e) {
      const error =
        typeof e === "object" && e !== null && "code" in e
          ? JSON.stringify(e, undefined, 2)
          : e;
      console.log(error);
    }
  }, []);

  const [isFabric, setFabric] = useState(false);
  const onLayout = useCallback(
    (ev: LayoutChangeEvent) => {
      setFabric(
        Boolean(
          // @ts-expect-error Internal handle to determine whether Fabric is enabled
          ev.currentTarget["_internalInstanceHandle"]?.stateNode?.canonical
        )
      );
    },
    [setFabric]
  );

  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onLayout={onLayout}
        style={styles.body}
      >
        <Header />
        <View style={styles.group}>
          <Button onPress={startAcquireToken}>Acquire Token</Button>
        </View>
        <DevMenu />
        <View style={styles.group}>
          <Feature value={getReactNativeVersion()}>React Native</Feature>
          <Separator />
          <Feature value={isOnOrOff(getHermesVersion())}>Hermes</Feature>
          <Separator />
          <Feature value={isOnOrOff(isFabric)}>Fabric</Feature>
          <Separator />
          <Feature value={isOnOrOff(isFabric && concurrentRoot)}>
            Concurrent React
          </Feature>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
