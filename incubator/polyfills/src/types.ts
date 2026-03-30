import type { ConfigT } from "metro-config";

export type Context = {
  projectRoot: string;
};

export type GetPreludeModules =
  ConfigT["serializer"]["getModulesRunBeforeMainModule"];
