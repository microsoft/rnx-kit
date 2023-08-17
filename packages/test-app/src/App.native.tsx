// @react-native-webapis
import { getReactNativeVersion } from "internal";
import { getHermesVersion } from "internal/hermes";
import React, { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import {
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

// STEP 1: import it
// import useBatteryStatus from "../web/src/useBatteryStatus";

function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
  const isDarkMode = useColorScheme() === "dark";
  const styles = useStyles();
  const [isFabric, setFabric] = useIsFabricComponent();

  // STEP 2: use it
  // const batteryLevel = useBatteryStatus();

  return (
    <SafeAreaView style={styles.body}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        onLayout={setFabric}
        style={styles.body}
      >
        <Header />
        {/* STEP 3: show it! */}
        {/* <View style={styles.group}>
          <Feature value={batteryLevel.toFixed(1)}>Battery Level</Feature>
        </View> */}
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

function useIsFabricComponent() {
  const [isFabric, setFabric] = useState(false);
  return [
    isFabric,
    useCallback(
      (ev: LayoutChangeEvent) => {
        setFabric(
          Boolean(
            // @ts-expect-error Internal handle to determine whether Fabric is enabled
            ev.currentTarget["_internalInstanceHandle"]?.stateNode?.canonical
          )
        );
      },
      [setFabric]
    ),
  ] as const;
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

export default App;
