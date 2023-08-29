// @ts-check
"use strict";

/**
 * @typedef {import("./index").Component} Component;
 */

const CALLABLE_PREFIX = "callable:";

/**
 * Returns the module object if it is a valid flighted object.
 * @param {unknown} moduleId
 * @returns {{module: string, flights: string[]} | undefined}
 */
function getFlightedModule(moduleId) {
  if (
    moduleId &&
    typeof moduleId === "object" &&
    "module" in moduleId &&
    typeof moduleId.module === "string" &&
    "flights" in moduleId &&
    Array.isArray(moduleId.flights)
  ) {
    return {
      module: moduleId.module,
      flights: moduleId.flights,
    };
  }
  return undefined;
}

/**
 * @param {string | number | boolean | Record<string, unknown> | null | undefined} experiences
 * @returns {Record<string, Component>}
 */
function parseExperiences(experiences) {
  if (!experiences || typeof experiences !== "object") {
    throw new Error(`Invalid experiences map; got '${typeof experiences}'`);
  }

  const flights = process.env["RN_LAZY_INDEX_FLIGHTS"]?.split(",");

  return Object.entries(experiences).reduce((components, [name, moduleId]) => {
    if (flights) {
      const flightedModule = getFlightedModule(moduleId);
      if (flightedModule) {
        const flighted = flights.some((flight) => {
          return flightedModule.flights.includes(flight);
        });

        if (!flighted) {
          return components;
        }

        moduleId = flightedModule.module;
      }
    }

    if (typeof moduleId !== "string") {
      return components;
    }

    /** @type {Component["type"]} */
    const type = name.startsWith(CALLABLE_PREFIX) ? "callable" : "app";
    const id = type === "callable" ? name.slice(CALLABLE_PREFIX.length) : name;

    components[id] = { type, moduleId };
    return components;
  }, /** @type {Record<string, Component>} */ ({}));
}

exports.getFlightedModule = getFlightedModule;
exports.parseExperiences = parseExperiences;
