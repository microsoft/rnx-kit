import { acquireTokenWithScopes } from "@rnx-kit/react-native-auth";
import React, { useEffect, useState } from "react";
import manifest from "../app.json";
import { Feature, Home, Separator } from "@rnx-repo-yarn-pnpm/test-app-shared";
import { Button } from "@rnx-repo-yarn-pnpm/button";
import { createTheme } from "./createTheme";
import { ThemeProvider } from "@fluentui-react-native/theme";

const theme = createTheme();

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
    <ThemeProvider theme={theme}>
      <Home concurrentRoot={concurrentRoot}>
        <Feature value={localStorageStatus}>window.localStorage</Feature>
        <Separator />
        <Button onClick={startAcquireToken}>Acquire Token</Button>
      </Home>
    </ThemeProvider>
  );
}
