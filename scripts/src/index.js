#!/usr/bin/env node
// @ts-check

import { Builtins, Cli } from "clipanion";
import { BuildCommand } from "./commands/build.js";
import { BundleCommand } from "./commands/bundle.js";
import { CleanCommand } from "./commands/clean.js";
import { FormatCommand } from "./commands/format.js";
import { LintCommand } from "./commands/lint.js";
import { TestCommand } from "./commands/test.js";
import { UpdateApiReadmeCommand } from "./commands/updateApiReadme.js";

const cli = new Cli({
  binaryLabel: "rnx-kit scripts CLI",
  binaryName: "rnx-kit-scripts",
  binaryVersion: "0.0.0",
});

cli.register(BuildCommand);
cli.register(BundleCommand);
cli.register(CleanCommand);
cli.register(FormatCommand);
cli.register(LintCommand);
cli.register(TestCommand);
cli.register(UpdateApiReadmeCommand);

cli.register(Builtins.DefinitionsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.runExit(process.argv.slice(2));
