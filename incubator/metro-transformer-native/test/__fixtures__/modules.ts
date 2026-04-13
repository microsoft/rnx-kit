// Import/export patterns with TypeScript
import { Platform } from "react-native";

export interface Config {
  apiUrl: string;
  timeout: number;
  debug: boolean;
}

export const defaultConfig: Config = {
  apiUrl: "https://api.example.com",
  timeout: 30000,
  debug: __DEV__,
};

export function createConfig(overrides: Partial<Config> = {}): Config {
  return { ...defaultConfig, ...overrides };
}

// Re-exports
export { Platform };

// Default export
const VERSION = "1.0.0";
export default VERSION;
