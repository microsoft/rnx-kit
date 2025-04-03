import type { Config } from "@react-native-community/cli-types";
import { Command } from "commander";
import * as path from "node:path";
import { loadContextForCommand } from "./context";
import { findExternalCommands } from "./externalCommands";

type CommandOption = Required<Config["commands"][number]>["options"][number];

function parseDefaultValue(
  defaultValue: CommandOption["default"],
  context: Config
): boolean | string | string[] | undefined {
  const value =
    typeof defaultValue === "function" ? defaultValue(context) : defaultValue;
  return typeof value === "number" ? value.toString() : value;
}

export async function main() {
  const [, , userCommand] = process.argv;

  const context = await loadContextForCommand(userCommand);
  const allCommands = context.commands.concat(findExternalCommands(context));
  const program = new Command(path.basename(__filename, ".js"));

  for (const {
    name,
    description,
    detached,
    options = [],
    func,
  } of allCommands) {
    const command = program.command(name).description(description ?? name);

    if (detached) {
      command.action((args, command) => func(command.args, args, context));
    } else {
      command.action((args, command) => func(command.args, context, args));
    }

    for (const { name, description, parse, default: defaultValue } of options) {
      const value = parseDefaultValue(defaultValue, context);
      if (parse) {
        command.option(name, description ?? name, parse, value);
      } else {
        command.option(name, description, value);
      }
    }
  }

  program.parse();
}
