import { type BaseContext } from "clipanion";

/**
 * Context type for commands in this package
 */
export type ScriptContext = BaseContext & {
  // current working directory for the command
  cwd: string;

  // root path of the repository
  root: string;
};
