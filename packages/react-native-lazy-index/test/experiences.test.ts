import { resolveModule } from "./../src/module";
import { parseExperiences } from "./../src/experiences";
import fs from "fs";

describe("parseExperiences()", () => {
  test("missing experiences section", () => {
    const packageManifest = resolveModule("./package.json");
    const { experiences } = JSON.parse(
      fs.readFileSync(packageManifest, "utf-8"),
    );
    const result = () => {
      parseExperiences(experiences);
    };
    expect(result).toThrow(Error);
    expect(result).toThrow("Missing `experiences` section in `package.json`");
  });

  test("invalid experiences section", () => {
    const experiences = "MyAwesomeApp";
    const result = () => {
      parseExperiences(experiences);
    };
    expect(result).toThrow(Error);
    expect(result).toThrow("Invalid `experiences` section in `package.json`");
  });

  test("object experiences section", () => {
    const experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      YetAnotherFeature: "@awesome-app/yet-another-feature",
      FinalFeature: "@awesome-app/final-feature",
      ExtraFeature: 5,
    };
    const result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        source: "package.json",
        type: "callable",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        source: "package.json",
        type: "app",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        source: "package.json",
        type: "app",
      },
      YetAnotherFeature: {
        moduleId: "@awesome-app/yet-another-feature",
        source: "package.json",
        type: "app",
      },
    });
  });

  test("flighted experiences", () => {
    let experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: { module: "@awesome-app/final-feature", flighted: true },
    };
    let result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        source: "package.json",
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        source: "package.json",
        type: "app",
      },
    });

    experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: { module: "@awesome-app/final-feature", flighted: false },
    };
    result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        source: "package.json",
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        source: "package.json",
        type: "app",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        source: "package.json",
        type: "app",
      },
    });
  });
});
