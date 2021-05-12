import type { Capability } from "@rnx-kit/config";
import { ProfileVersion, getAllProfiles } from "./profiles";

function maxStringLength(currentMax: number, str: string): number {
  return Math.max(currentMax, str.length);
}

function sortCoreFirst(lhs: string, rhs: string): number {
  if (lhs.startsWith("core-")) {
    if (!rhs.startsWith("core-")) {
      return -1;
    }
  } else if (rhs.startsWith("core-")) {
    return 1;
  }

  if (lhs === rhs) {
    return 0;
  }

  return lhs < rhs ? -1 : 1;
}

const allProfiles = getAllProfiles();
const allVersions = Object.keys(allProfiles).reverse() as ProfileVersion[];
const allCapabilities = Object.keys(allProfiles["0.64"]).sort(
  sortCoreFirst
) as Capability[];

const headers = ["Capability", ...allVersions];

const columns = allVersions.reduce<string[][]>(
  (result, version) => {
    const profile = allProfiles[version];
    const column = allCapabilities.map((capability) => {
      const { name, version } = profile[capability];
      return `${name}@${version}`;
    });
    result.push(column);
    return result;
  },
  [allCapabilities]
);

const columnWidths = columns.map((column, index) =>
  column.reduce(maxStringLength, headers[index].length)
);

const pad = (s: string, index: number) => s.padEnd(columnWidths[index]);

const table = [
  `| ${headers.map(pad).join(" | ")} |`,
  `| ${columnWidths.map((width) => "-".repeat(width)).join(" | ")} |`,
  ...allCapabilities.map(
    (_, capability) =>
      `| ${columns
        .map((column, index) => pad(column[capability], index))
        .join(" | ")} |`
  ),
].join("\n");

console.log(table);
