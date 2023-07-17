import { resolveModule } from "./../src/module";
import { parseExperiences, getFlight } from "./../src/experiences";
import fs from "fs";

describe("parseExperiences()", () => {
  test("missing experiences section", () => {
    const packageManifest = resolveModule("./package.json");
    const { experiences } = JSON.parse(
      fs.readFileSync(packageManifest, "utf-8")
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

  test("single flighted experiences", () => {
    let experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
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

    process.env.RN_LAZY_INDEX_FLIGHTS = "FinalFeature";
    experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
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

  test("multiple flighted experiences", () => {
    process.env.RN_LAZY_INDEX_FLIGHTS = "";
    let experiences = {
      SomeFeature: {
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      },
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
    };
    let result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        source: "package.json",
        type: "callable",
      },
    });

    process.env.RN_LAZY_INDEX_FLIGHTS = "SomeFeature,FinalFeature";
    experiences = {
      SomeFeature: {
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      },
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
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

describe("getFlight()", () => {
  test("empty flight object", () => {
    const emptyFlight = {};
    const result = getFlight(emptyFlight);
    expect(result).toBeUndefined();
  });

  test("missing fields", () => {
    const noModule = { flights: ["SomeFeature"] };
    expect(getFlight(noModule)).toBeUndefined();

    const noFlight = { module: "@awesome-app/some-feature" };
    expect(getFlight(noFlight)).toBeUndefined();
  });

  test("wrong field type", () => {
    const flightsString = { flights: "SomeFeature" };
    expect(getFlight(flightsString)).toBeUndefined();

    const moduleArray = { module: ["@awesome-app/some-feature"] };
    expect(getFlight(moduleArray)).toBeUndefined();

    const flightsObject = { flights: { val: "SomeFeature" } };
    expect(getFlight(flightsObject)).toBeUndefined();

    const moduleObject = { module: { val: "@awesome-app/some-feature" } };
    expect(getFlight(moduleObject)).toBeUndefined();

    const flightsInt = { flights: 1 };
    expect(getFlight(flightsInt)).toBeUndefined();

    const moduleInt = { module: 1 };
    expect(getFlight(moduleInt)).toBeUndefined();
  });

  test("valid flight object", () => {
    const flight = {
      module: "@awesome-app/some-feature",
      flights: ["SomeFeature"],
    };
    expect(getFlight(flight)).toEqual({
      module: "@awesome-app/some-feature",
      flights: ["SomeFeature"],
    });
  });
});
