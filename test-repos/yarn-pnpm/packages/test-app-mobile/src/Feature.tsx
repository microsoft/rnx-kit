import React from "react";
import { Switch, Text, View } from "react-native";
import { useStyles } from "./styles";

type FeatureProps =
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

export function Feature({
  children: label,
  value,
  ...props
}: FeatureProps): React.ReactElement<FeatureProps> {
  const styles = useStyles();
  return (
    <View style={styles.groupItemContainer}>
      <Text style={styles.groupItemLabel}>{label}</Text>
      {typeof value === "boolean" ? (
        <Switch value={value} {...props} />
      ) : (
        <Text testID={testID(label)} style={styles.groupItemValue}>
          {value}
        </Text>
      )}
    </View>
  );
}
