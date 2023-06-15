import yargs from "yargs";
import { analyze } from "./analyze.js";
import { compare } from "./compare.js";
import { webpackStats } from "./webpackStats.js";
import type { Metafile } from "./metafile.js";
import fs from "fs";

export function main(): void {
  yargs(process.argv.slice(2))
    .command(
      "analyze",
      "Analyzes a metro bundle by analyzing the esbuild metafile",
      (yargs) =>
        yargs
          .option("metafile", {
            describe: "The esbuild metafile to analyze",
            type: "string",
            demandOption: true,
          })
          .option("detailed", {
            describe:
              "Get detailed information about how the duplicates are bundled",
            type: "boolean",
            default: false,
          })
          .option("transform", {
            describe:
              "Generates a webpack stats file from the esbuild metafile and sets the output file to write the stats file to",
            type: "string",
          })
          .option("json", {
            describe: "Output analysis information as JSON",
            type: "string",
          }),
      (argv) => {
        analyze(argv.metafile, argv.detailed, argv.transform, argv.json);
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
      "transform",
      "Transform the esbuild metafile to webpack JSON stats",
      (yargs) =>
        yargs
          .option("metafile", {
            describe: "The esbuild metafile to analyze",
            type: "string",
            demandOption: true,
          })
          .option("outputFile", {
            describe: "Output file to write the Webpack stats file to",
            type: "string",
            demandOption: true,
          })
          .option("skipLineNumber", {
            describe: "Skip line number in the output",
            type: "boolean",
            demandOption: false,
            default: false,
          }),
      (argv) => {
        const content = fs.readFileSync(argv.metafile, {
          encoding: "utf-8",
        });
        const metafile: Metafile = JSON.parse(content);

        webpackStats(
          metafile,
          argv.metafile,
          argv.skipLineNumber,
          argv.outputFile
        );
      }
    )
    .demandCommand().argv;
}

main();
