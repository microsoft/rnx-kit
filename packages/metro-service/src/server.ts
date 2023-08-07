import { runServer } from "metro";
import { ensureBabelConfig } from "./babel";

export const startServer: typeof runServer = (config, ...args) => {
  ensureBabelConfig(config);
  return runServer(config, ...args);
};
