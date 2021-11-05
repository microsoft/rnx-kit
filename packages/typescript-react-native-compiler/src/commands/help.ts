import { usage } from "../usage";
import { tsc } from "./tsc";

export function showHelp(): void {
  usage();
  tsc("--help");
}

export function showAllHelp(): void {
  usage();
  tsc("--all");
}
