import yargs from "yargs";
import { analyze } from "./analyze";
import { compare } from "./compare";
import { transform } from "./webpackStats";

export function main(): void {
  yargs(process.argv.slice(2))
    .command(
      "analyze <metafile>",
      "Analyzes a bundle by consuming and analyzing an esbuild metafile",
      (yargs) =>
        yargs
          .positional("metafile", {
            describe: "The esbuild metafile to analyze",
            type: "string",
            demandOption: true,
          })
          .option("show-duplicates", {
            describe:
              "Get detailed information about how the duplicates are bundled",
            type: "boolean",
            default: false,
          })
          .option("json", {
            describe: "Output analysis information as JSON",
            type: "string",
          })
          .option("namespace", {
            describe:
              "Removes the namespace from every module to get cleaner output",
            type: "string",
          }),
      (argv) => {
        analyze(
          argv.metafile,
          argv["show-duplicates"],
          argv.namespace,
          argv.json
        );
      }
    )
    .command(
      "compare",
      "Compares two esbuild metafiles and outputs the differences",
      (yargs) =>
        yargs
          .option("baseline", {
            describe: "Baseline metafile file",
            type: "string",
            demandOption: true,
          })
          .option("candidate", {
            describe: "Candidate metafile file",
            type: "string",
            demandOption: true,
          }),
      (argv) => {
        compare(argv.baseline, argv.candidate);
      }
    )
    .command(
      "transform <metafile>",
      "Transform the esbuild metafile to webpack JSON stats file",
      (yargs) =>
        yargs
          .positional("metafile", {
            describe: "The esbuild metafile to analyze",
            type: "string",
            demandOption: true,
          })
          .option("output", {
            describe: "Output file to write the Webpack stats file to",
            type: "string",
            demandOption: true,
          }),
      (argv) => {
        transform(argv.metafile, argv.output);
      }
    )
    .demandCommand().argv;
}

main();
