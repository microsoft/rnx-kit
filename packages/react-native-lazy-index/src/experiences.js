// @ts-check
"use strict";

const { scanModule } = require("./module");

/**
 * @typedef {import("./generateLazyIndex").Component} Component;
 */

const CALLABLE_PREFIX = "callable:";
const DEFAULT_MAX_DEPTH = 3;

/**
 * Retrieves platform extensions from command line arguments.
 *
 * TODO: This method needs to be implemented.
 *
 * @returns {string[]}
 */
function getPlatformExtensions() {
  return [".ios", ".android", ".native"];
}

/**
 * Same as `parseInt()` but with a default value.
 * @param {string | undefined} s
 * @param {number} defaultValue
 */
function parseIntDefault(s, defaultValue) {
  const value = parseInt(s || "");
  return isNaN(value) ? defaultValue : value;
}

/**
 * Returns the module object if it is a valid flighted object.
 * @param {unknown} moduleId
 * @returns {{module: string, flights: string[]} | undefined}
 */
function getFlight(moduleId) {
  if (
    moduleId &&
    typeof moduleId === "object" &&
    "module" in moduleId &&
    typeof moduleId.module === "string" &&
    "flights" in moduleId &&
    Array.isArray(moduleId.flights)
  ) {
    // @ts-ignore
    return moduleId;
  }
  return undefined;
}

/**
 * @param {string[]} experiences
 * @returns {Record<string, Component>}
 */
function parseExperiencesFromArray(experiences) {
  const depth = parseIntDefault(
    process.env["RN_LAZY_INDEX_MAX_DEPTH"],
    DEFAULT_MAX_DEPTH
  );

  const platformExtensions = getPlatformExtensions();

  /** @type {Set<string>} */
  const visited = new Set();

  const verbose = Boolean(process.env["RN_LAZY_INDEX_VERBOSE"]);

  return experiences.reduce(
    (components, module) =>
      scanModule(components, module, {
        module,
        depth,
        platformExtensions,
        visited,
        verbose,
      }),
    /** @type {Record<string, Component>} */ ({})
  );
}

/**
 * @param {Record<string, unknown>} experiences
 * @returns {Record<string, Component>}
 */
function parseExperiencesFromObject(experiences) {
  const flights = process.env["RN_LAZY_INDEX_FLIGHTS"]?.split(",");

  return Object.keys(experiences).reduce((components, name) => {
    let moduleId = experiences[name];
    const flightedModule = getFlight(moduleId);

    if (flightedModule) {
      const flighted = flights?.some((flight) => {
        return flightedModule.flights.includes(flight);
      });

      if (!flighted) {
        return components;
      }

      moduleId = flightedModule.module;
    }

    if (typeof moduleId !== "string") {
      return components;
    }

    /** @type {[Component["type"], string]} */
    const [type, id] = name.startsWith(CALLABLE_PREFIX)
      ? ["callable", name.slice(CALLABLE_PREFIX.length)]
      : ["app", name];

    components[id] = { type, moduleId, source: "package.json" };
    return components;
  }, /** @type {Record<string, Component>} */ ({}));
}

/**
 * @param {string | number | boolean | Record<string, unknown> | null | undefined} experiences
 * @returns {Record<string, Component>}
 */
function parseExperiences(experiences) {
  if (!experiences) {
    throw new Error("Missing `experiences` section in `package.json`");
  }

  if (Array.isArray(experiences)) {
    return parseExperiencesFromArray(experiences);
  }

  if (typeof experiences === "object") {
    return parseExperiencesFromObject(experiences);
  }

  throw new Error("Invalid `experiences` section in `package.json`");
}

exports.parseExperiences = parseExperiences;
exports.getFlight = getFlight;
