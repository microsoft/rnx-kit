import type { BaseContext } from "clipanion";

export type ScriptContext = BaseContext & {
  /**
   * The current working directory.
   */
  cwd: string;

  /**
   * The root directory of the project.
   */
  root: string;
};
