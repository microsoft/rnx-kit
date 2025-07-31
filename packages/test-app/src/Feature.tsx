import React from "react";
import { Switch, Text, View } from "react-native";
import { useStyles } from "./styles";

export type FeatureProps =
  | { children: string; value: string }
  | {
      children: string;
      value: boolean;
      disabled?: boolean;
      onValueChange?: (value: boolean) => void;
    };

function testID(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-") + "-value";
}

function toString(value: boolean | string): string {
  if (typeof value === "string") {
    return value;
  }

  return value ? "On" : "Off";
}

export function Feature({
  children: label,
  value,
  ...props
}: FeatureProps): React.ReactElement<FeatureProps> {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{label}</Text>
      {"onValueChange" in props ? (
        <Switch value={Boolean(value)} {...props} />
      ) : (
        <Text testID={testID(label)} style={styles.groupItemValue}>
          {toString(value)}
        </Text>
      )}
    </View>
  );
}
