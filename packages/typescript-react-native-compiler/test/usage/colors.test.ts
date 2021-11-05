import { createUsageColors } from "../../src/usage/colors";

describe("Usage > Colors > createUsageColors", () => {
  test("creates a colorless implementation", () => {
    const colors = createUsageColors("none");
    expect(colors.bold("test")).toEqual("test");
    expect(colors.blue("test")).toEqual("test");
    expect(colors.blueBackground("test")).toEqual("test");
    expect(colors.brightWhite("test")).toEqual("test");
  });

  test("creates a colorful implementation", () => {
    const colors = createUsageColors("rich");
    expect(colors.bold("test")).not.toEqual("test");
    expect(colors.bold("test")).toEqual(expect.stringContaining("test"));
    expect(colors.blue("test")).not.toEqual("test");
    expect(colors.blue("test")).toEqual(expect.stringContaining("test"));
    expect(colors.blueBackground("test")).not.toEqual("test");
    expect(colors.blueBackground("test")).toEqual(
      expect.stringContaining("test")
    );
    expect(colors.brightWhite("test")).not.toEqual("test");
    expect(colors.brightWhite("test")).toEqual(expect.stringContaining("test"));
  });
});
