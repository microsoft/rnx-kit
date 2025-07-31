import { useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";

// https://github.com/facebook/react-native/blob/0abd5d63e1c0c4708f81bd698e6d011fa75f01e5/packages/new-app-screen/src/Theme.js#L16-L33
const COLORS = {
  light: {
    background: "#f3f3f3",
    backgroundHighlight: "#cfe6ee",
    cardBackground: "#fff",
    cardOutline: "#dae1e7",
    textPrimary: "#000",
    textSecondary: "#404756",
  },
  dark: {
    background: "#000",
    backgroundHighlight: "#193c47",
    cardBackground: "#222",
    cardOutline: "#444",
    textPrimary: "#fff",
    textSecondary: "#c0c1c4",
  },
};

export function useStyles() {
  const colorScheme = useColorScheme();
  return useMemo(() => {
    const colors = COLORS[colorScheme ?? "light"];

    const fontSize = 18;
    const groupBorderRadius = 8;
    const margin = 16;

    return StyleSheet.create({
      body: {
        backgroundColor: colors.background,
        flex: 1,
      },
      group: {
        backgroundColor: colors.cardBackground,
        borderRadius: groupBorderRadius,
        margin,
      },
      groupItemContainer: {
        alignItems: "center",
        flexDirection: "row",
        paddingHorizontal: margin,
      },
      groupItemLabel: {
        color: colors.textPrimary,
        flex: 1,
        fontSize,
        marginVertical: 12,
      },
      groupItemValue: {
        color: colors.textSecondary,
        fontSize: fontSize,
        textAlign: "right",
      },
      separator: {
        backgroundColor: colors.cardOutline,
        height: StyleSheet.hairlineWidth,
        marginStart: margin,
      },
      title: {
        fontSize: 40,
        fontWeight: "700",
        paddingTop: 64,
        paddingHorizontal: 32,
        paddingBottom: 40,
        textAlign: "center",
      },
    });
  }, [colorScheme]);
}
