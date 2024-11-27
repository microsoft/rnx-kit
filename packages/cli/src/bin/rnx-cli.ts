import { Command } from "commander";
import * as path from "node:path";
import { loadContextForCommand } from "./context";
import { findExternalCommands } from "./externalCommands";

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

    for (const { name, description, parse, default: def } of options) {
      if (parse) {
        command.option(name, description ?? name, (input) => parse(input), def);
      } else {
        command.option(name, description, def?.toString());
      }
    }
  }

  program.parse();
}
