import {
  asBoolean,
  asNumber,
  asResolvedPath,
  asStringArray,
} from "../src/parsers";
import { rnxStartCommand } from "../src/start";

describe("rnx-start", () => {
  it("correctly parses cli arguments", () => {
    const needsResolvedPaths = ["--config", "--projectRoot"];
    for (const { name, parse } of rnxStartCommand.options) {
      if (name.endsWith("[boolean]")) {
        expect(parse).toBe(asBoolean);
      } else if (name.endsWith("[list]")) {
        expect(parse).toBe(asStringArray);
      } else if (name.endsWith("[number]")) {
        expect(parse).toBe(asNumber);
      } else if (needsResolvedPaths.some((flag) => name.startsWith(flag))) {
        expect(parse).toBe(asResolvedPath);
      }
    }
  });
});
