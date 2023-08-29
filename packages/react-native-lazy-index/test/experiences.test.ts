import { getFlightedModule, parseExperiences } from "../src/experiences";

describe("parseExperiences()", () => {
  afterEach(() => {
    process.env.RN_LAZY_INDEX_FLIGHTS = "";
  });

  test("missing experiences section", () => {
    const result = () => parseExperiences(undefined);
    expect(result).toThrow(Error);
    expect(result).toThrow("Invalid experiences map; got 'undefined'");
  });

  test("invalid experiences section", () => {
    const result = () => parseExperiences("MyAwesomeApp");
    expect(result).toThrow(Error);
    expect(result).toThrow("Invalid experiences map; got 'string'");
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
        type: "callable",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        type: "app",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        type: "app",
      },
      YetAnotherFeature: {
        moduleId: "@awesome-app/yet-another-feature",
        type: "app",
      },
    });
  });

  test("single flighted experiences", () => {
    const experiences = {
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
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        type: "app",
      },
    });

    process.env.RN_LAZY_INDEX_FLIGHTS = "FinalFeature";
    result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        type: "app",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        type: "app",
      },
    });
  });

  test("multiple flighted experiences", () => {
    const experiences = {
      SomeFeature: {
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      },
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
      "callable:ThirdFeature": {
        module: "@awesome-app/third-feature",
        flights: ["ThirdFeature"],
      },
    };
    let result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        type: "callable",
      },
    });

    process.env.RN_LAZY_INDEX_FLIGHTS = "SomeFeature,FinalFeature";
    result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        type: "app",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        type: "app",
      },
    });

    process.env.RN_LAZY_INDEX_FLIGHTS = "SomeFeature,FinalFeature,ThirdFeature";
    result = parseExperiences(experiences);
    expect(result).toEqual({
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        type: "callable",
      },
      SomeFeature: {
        moduleId: "@awesome-app/some-feature",
        type: "app",
      },
      FinalFeature: {
        moduleId: "@awesome-app/final-feature",
        type: "app",
      },
      ThirdFeature: {
        moduleId: "@awesome-app/third-feature",
        type: "callable",
      },
    });
  });
});

describe("getFlight()", () => {
  test("empty flight object", () => {
    const emptyFlight = {};
    const result = getFlightedModule(emptyFlight);
    expect(result).toBeUndefined();
  });

  test("missing fields", () => {
    const noModule = { flights: ["SomeFeature"] };
    expect(getFlightedModule(noModule)).toBeUndefined();

    const noFlight = { module: "@awesome-app/some-feature" };
    expect(getFlightedModule(noFlight)).toBeUndefined();
  });

  test("wrong field type", () => {
    const flightsString = { flights: "SomeFeature" };
    expect(getFlightedModule(flightsString)).toBeUndefined();

    const moduleArray = { module: ["@awesome-app/some-feature"] };
    expect(getFlightedModule(moduleArray)).toBeUndefined();

    const flightsObject = { flights: { val: "SomeFeature" } };
    expect(getFlightedModule(flightsObject)).toBeUndefined();

    const moduleObject = { module: { val: "@awesome-app/some-feature" } };
    expect(getFlightedModule(moduleObject)).toBeUndefined();

    const flightsInt = { flights: 1 };
    expect(getFlightedModule(flightsInt)).toBeUndefined();

    const moduleInt = { module: 1 };
    expect(getFlightedModule(moduleInt)).toBeUndefined();

    const invalidModuleValidFlights = {
      module: ["@awesome-app/some-feature"],
      flights: ["SomeFeature"],
    };
    expect(getFlightedModule(invalidModuleValidFlights)).toBeUndefined();

    const invalidFlightsValidModule = {
      module: "@awesome-app/some-feature",
      flights: "SomeFeature",
    };
    expect(getFlightedModule(invalidFlightsValidModule)).toBeUndefined();
  });

  test("valid flight object", () => {
    expect(
      getFlightedModule({
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      })
    ).toEqual({
      module: "@awesome-app/some-feature",
      flights: ["SomeFeature"],
    });
  });
});
