// @ts-check

import { Command, Option } from "clipanion";
import { SCRIPT_TEST_COMMAND } from "./test-scripts/constants.js";

export class ScriptTestCommand extends Command {
  /**
   * @override
   */
  static paths = [[SCRIPT_TEST_COMMAND]];

  /**
   * @override
   */
  static usage = Command.Usage({
    description: "Executes scripts build from the tools-scripts package",
    details: `
      This command executes a sub-cli which can only be run once the tools-scripts package (and its dependencies) has been built.
      This command is useful for testing the tools-scripts package in a local workspace.
    `,
    examples: [
      [`Execute a test script`, `$0 ${SCRIPT_TEST_COMMAND} <command>`],
    ],
  });

  rest = Option.Proxy();

  async execute() {
    const { getCli } = await import("./test-scripts/cli.js");
    const cli = getCli();
    return await cli.run(process.argv.slice(3), cli.context());
  }
}
