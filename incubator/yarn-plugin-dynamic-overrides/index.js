// @ts-check

/**
 * @import { Descriptor, Hooks, Ident, Plugin, Project } from "@yarnpkg/core";
 *
 * @typedef {Ident & { specifier: string; }} ExtendedIdent
 */

const DEFAULT_SPECIFIER = "^";
const DYNAMIC_OVERRIDES_KEY = "dynamicPackageOverrides";
const DEFAULT_SPECIFIER_KEY = "defaultSpecifier";
const OVERRIDES_KEY = "overrides";

/**
 * @param {Descriptor} dependency
 * @param {Ident=} locator
 * @returns {locator is Ident}
 */
function matches(dependency, locator) {
  if (!locator) {
    return false;
  }

  // appium -> @appium/base-plugin
  if (locator.name === dependency.scope) {
    return false;
  }

  // @appium/base-plugin -> @appium/base-driver
  if (locator.scope && locator.scope === dependency.scope) {
    return false;
  }

  return true;
}

// This module *must* be CommonJS because `actions/setup-node` (and probably
// other GitHub actions) does not support ESM. Yarn itself does.
exports.name = "@rnx-kit/yarn-plugin-dynamic-overrides";

/** @type {(require: NodeJS.Require) => Plugin<Hooks>} */
exports.factory = (require) => {
  const { SettingsType, structUtils } = require("@yarnpkg/core");

  /**
   * @param {Project} project
   * @returns {Map<string, ExtendedIdent>}
   */
  function parseConfig(project) {
    const config = project.configuration.get(DYNAMIC_OVERRIDES_KEY);
    if (!(config instanceof Map)) {
      throw new Error(`Expected "${DYNAMIC_OVERRIDES_KEY}" to be a map`);
    }

    const defaultSpecifier = config.get(DEFAULT_SPECIFIER_KEY);
    if (typeof defaultSpecifier !== "string") {
      throw new Error(
        `Expected "${DYNAMIC_OVERRIDES_KEY}.${DEFAULT_SPECIFIER_KEY}" to be a string`
      );
    }

    const overrides = config.get(OVERRIDES_KEY);
    if (!Array.isArray(overrides)) {
      throw new Error(
        `Expected "${DYNAMIC_OVERRIDES_KEY}.${OVERRIDES_KEY}" to be an array`
      );
    }

    return new Map(
      overrides.map((entry) => {
        const id = entry.get("id");
        if (!id) {
          throw new Error(
            `"${DYNAMIC_OVERRIDES_KEY}.${OVERRIDES_KEY}" expects an id`
          );
        }
        const ident = structUtils.parseIdent(id);
        return [
          ident.identHash,
          {
            ...ident,
            specifier: entry.get("specifier") ?? defaultSpecifier,
          },
        ];
      })
    );
  }

  /** @type {Plugin<Hooks>["configuration"] & Record<string, unknown>} */
  const configuration = {};
  configuration[DYNAMIC_OVERRIDES_KEY] = {
    description: "Packages whose dependencies are overridden",
    type: SettingsType.SHAPE,
    properties: {
      defaultSpecifier: {
        type: SettingsType.STRING,
        default: DEFAULT_SPECIFIER,
      },
      overrides: {
        type: SettingsType.SHAPE,
        isArray: true,
        properties: {
          id: {
            type: SettingsType.STRING,
          },
          specifier: {
            type: SettingsType.STRING,
          },
        },
      },
    },
  };

  /** @type {Map<string, ExtendedIdent>} */
  let overrides;

  return {
    configuration,
    hooks: {
      reduceDependency: async (
        dependency,
        project,
        locator,
        _initialDependency,
        _extra
      ) => {
        if (!overrides) {
          overrides = parseConfig(project);
        }

        const ident = overrides.get(locator.identHash);
        if (matches(dependency, ident)) {
          const { protocol, selector } = structUtils.parseRange(
            dependency.range
          );
          if (protocol === "npm:" && /^\d/.test(selector)) {
            return structUtils.makeDescriptor(
              dependency,
              `${protocol}${ident.specifier}${selector}`
            );
          }
        }
        return dependency;
      },
    },
  };
};
