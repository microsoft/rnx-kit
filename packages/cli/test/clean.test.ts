import { rnxCleanCommand } from "../src/clean";
import {
  asBoolean,
  asNumber,
  asResolvedPath,
  asStringArray,
} from "../src/parsers";

describe("rnx-clean", () => {
  it("correctly parses cli arguments", () => {
    for (const { name, parse } of rnxCleanCommand.options) {
      if (name.endsWith("[boolean]")) {
        expect(parse).toBe(asBoolean);
      } else if (name.endsWith("[list]")) {
        expect(parse).toBe(asStringArray);
      } else if (name.endsWith("[number]")) {
        expect(parse).toBe(asNumber);
      } else if (name.endsWith("<path>")) {
        expect(parse).toBe(asResolvedPath);
      }
    }
  });
});
