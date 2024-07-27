import { deepEqual, ok, throws } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getFlightedModule, parseExperiences } from "../src/experiences";

describe("parseExperiences()", () => {
  afterEach(() => {
    process.env.RN_LAZY_INDEX_FLIGHTS = "";
  });

  it("handles missing experiences section", () => {
    const result = () => parseExperiences(undefined);
    throws(result, new Error("Invalid experiences map; got 'undefined'"));
  });

  it("handles invalid experiences section", () => {
    const result = () => parseExperiences("MyAwesomeApp");
    throws(result, new Error("Invalid experiences map; got 'string'"));
  });

  it("parses object experiences section", () => {
    const experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      YetAnotherFeature: "@awesome-app/yet-another-feature",
      FinalFeature: "@awesome-app/final-feature",
      ExtraFeature: 5,
    };
    const result = parseExperiences(experiences);
    deepEqual(result, {
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

  it("supports single flighted experiences", () => {
    const experiences = {
      SomeFeature: "@awesome-app/some-feature",
      "callable:AnotherFeature": "@awesome-app/another-feature",
      FinalFeature: {
        module: "@awesome-app/final-feature",
        flights: ["FinalFeature"],
      },
    };
    let result = parseExperiences(experiences);
    deepEqual(result, {
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
    deepEqual(result, {
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

  it("supports multiple flighted experiences", () => {
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
    deepEqual(result, {
      AnotherFeature: {
        moduleId: "@awesome-app/another-feature",
        type: "callable",
      },
    });

    process.env.RN_LAZY_INDEX_FLIGHTS = "SomeFeature,FinalFeature";
    result = parseExperiences(experiences);
    deepEqual(result, {
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
    deepEqual(result, {
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
  it("handles empty flight object", () => {
    const emptyFlight = {};
    const result = getFlightedModule(emptyFlight);
    ok(!result);
  });

  it("handles missing fields", () => {
    const noModule = { flights: ["SomeFeature"] };
    ok(!getFlightedModule(noModule));

    const noFlight = { module: "@awesome-app/some-feature" };
    ok(!getFlightedModule(noFlight));
  });

  it("handles wrong field type", () => {
    const flightsString = { flights: "SomeFeature" };
    ok(!getFlightedModule(flightsString));

    const moduleArray = { module: ["@awesome-app/some-feature"] };
    ok(!getFlightedModule(moduleArray));

    const flightsObject = { flights: { val: "SomeFeature" } };
    ok(!getFlightedModule(flightsObject));

    const moduleObject = { module: { val: "@awesome-app/some-feature" } };
    ok(!getFlightedModule(moduleObject));

    const flightsInt = { flights: 1 };
    ok(!getFlightedModule(flightsInt));

    const moduleInt = { module: 1 };
    ok(!getFlightedModule(moduleInt));

    const invalidModuleValidFlights = {
      module: ["@awesome-app/some-feature"],
      flights: ["SomeFeature"],
    };
    ok(!getFlightedModule(invalidModuleValidFlights));

    const invalidFlightsValidModule = {
      module: "@awesome-app/some-feature",
      flights: "SomeFeature",
    };
    ok(!getFlightedModule(invalidFlightsValidModule));
  });

  it("parses valid flight object", () => {
    deepEqual(
      getFlightedModule({
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      }),
      {
        module: "@awesome-app/some-feature",
        flights: ["SomeFeature"],
      }
    );
  });
});
