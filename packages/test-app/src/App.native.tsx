import { acquireTokenWithScopes } from "@rnx-kit/react-native-auth";
import React, { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import manifest from "../app.json";
import { Feature } from "./Feature";
import { Home } from "./Home";
import { Separator } from "./Separator";
import { useStyles } from "./styles";

type ButtonProps = {
  children: string;
  onPress: () => void;
};

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

function useLocalStorageStatus() {
  const [localValue, setLocalValue] = useState("Checking");
  useEffect(() => {
    const key = "sample/local-storage";
    window?.localStorage?.setItem(key, "Available");
    setLocalValue(window?.localStorage?.getItem(key) ?? "Error");
    return () => window?.localStorage?.removeItem(key);
  }, []);
  return localValue;
}

export function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
  const localStorageStatus = useLocalStorageStatus();
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
  return (
    <Home concurrentRoot={concurrentRoot}>
      <Feature value={localStorageStatus}>window.localStorage</Feature>
      <Separator />
      <Button onPress={startAcquireToken}>Acquire Token</Button>
    </Home>
  );
}
