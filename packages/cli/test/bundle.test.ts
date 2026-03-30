import { rnxBundleCommand } from "../src/bundle.ts";
import { asBoolean, asNumber, asStringArray } from "../src/helpers/parsers.ts";

describe("rnx-bundle", () => {
  it("correctly parses cli arguments", () => {
    for (const { name, parse } of rnxBundleCommand.options) {
      if (name.endsWith("[boolean]")) {
        expect(parse).toBe(asBoolean);
      } else if (name.endsWith("<list>")) {
        expect(parse).toBe(asStringArray);
      } else if (name.endsWith("<number>")) {
        expect(parse).toBe(asNumber);
      }
    }
  });
});
