/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@rnx-kit/yarn-plugin-external-workspaces",
factory: function (require) {
"use strict";
var plugin = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../packages/tools-workspaces/lib/external/logging.js
  var require_logging = __commonJS({
    "../../packages/tools-workspaces/lib/external/logging.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.enableLogging = enableLogging;
      exports.trace = trace2;
      var node_fs_1 = __importDefault(__require("fs"));
      var node_path_1 = __importDefault(__require("path"));
      var LOG_PATH = node_path_1.default.join(process.cwd(), "plugin-external-workspaces.log");
      var START_TIME = performance.now();
      var consoleMode = "console";
      var traceTo = void 0;
      var emptyCallback = () => null;
      function enableLogging(traceSetting) {
        traceTo = traceSetting ?? LOG_PATH;
        if (traceTo !== consoleMode) {
          node_fs_1.default.appendFile(LOG_PATH, `
=== STARTING LOGGING SESSION: ${(/* @__PURE__ */ new Date()).toISOString()} ===
`, emptyCallback);
        }
      }
      function trace2(msg) {
        if (traceTo) {
          const delta = (performance.now() - START_TIME).toFixed(2);
          if (traceTo === consoleMode) {
            console.log(`[${delta}ms] ${msg}`);
          } else {
            node_fs_1.default.appendFile(LOG_PATH, `[${delta}ms] ${msg}
`, emptyCallback);
          }
        }
      }
    }
  });

  // ../../packages/tools-workspaces/lib/external/finder.js
  var require_finder = __commonJS({
    "../../packages/tools-workspaces/lib/external/finder.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parseJsonPath = parseJsonPath;
      exports.getDepsFromJson = getDepsFromJson;
      exports.createFinderFromJson = createFinderFromJson;
      exports.createFinderFromJs = createFinderFromJs;
      exports.loadConfigFile = loadConfigFile2;
      var node_fs_1 = __importDefault(__require("fs"));
      var node_path_1 = __importDefault(__require("path"));
      var logging_1 = require_logging();
      var jsonExt = ".json";
      var nullFinder = (_pkgName) => null;
      function parseJsonPath(configPath) {
        const jsonIndex = configPath.indexOf(jsonExt);
        if (jsonIndex > 0) {
          const jsonEndIndex = jsonIndex + jsonExt.length;
          const jsonPath = configPath.slice(0, jsonEndIndex);
          const keysPath = configPath.length > jsonEndIndex + 1 ? configPath.slice(jsonEndIndex + 1) : "";
          return { jsonPath, keysPath };
        }
        return {};
      }
      function getDepsFromJson(parsedJson, keysPath) {
        const keys = keysPath ? keysPath.split("/") : [];
        let deps = parsedJson;
        for (const key of keys) {
          deps = deps[key];
          if (!deps) {
            return void 0;
          }
        }
        return deps;
      }
      function createFinderFromJson(jsonPath, keysPath) {
        if (node_fs_1.default.existsSync(jsonPath)) {
          const deps = getDepsFromJson(JSON.parse(node_fs_1.default.readFileSync(jsonPath, "utf8")), keysPath);
          if (deps) {
            (0, logging_1.trace)(`Loaded the finder from the json file ${jsonPath}`);
            return (pkgName) => deps[pkgName] ?? null;
          }
        }
        return nullFinder;
      }
      function createFinderFromJs(jsPath) {
        const config = __require(jsPath);
        if (!config) {
          throw new Error(`Unable to load config from ${jsPath}`);
        }
        (0, logging_1.trace)(`Creating a finder from: ${jsPath}`);
        return config.default;
      }
      function createValidatingFinder(finder, basePath) {
        const cache = /* @__PURE__ */ new Map();
        return (pkgName) => {
          if (cache.has(pkgName)) {
            return cache.get(pkgName) ?? null;
          }
          const pkgDef = finder(pkgName);
          const result = pkgDef ? { ...pkgDef } : null;
          if (result && result.path) {
            if (!node_path_1.default.isAbsolute(result.path)) {
              result.path = node_path_1.default.resolve(basePath, result.path);
            }
            if (!node_fs_1.default.existsSync(node_path_1.default.join(result.path, "package.json"))) {
              (0, logging_1.trace)(`finder: ${pkgName} not found at ${result.path}`);
              result.path = void 0;
            } else {
              (0, logging_1.trace)(`finder: ${pkgName} found at ${result.path}`);
            }
          }
          cache.set(pkgName, result);
          return result;
        };
      }
      function loadConfigFile2(configPath) {
        configPath = node_path_1.default.resolve(process.cwd(), configPath);
        const { jsonPath, keysPath } = parseJsonPath(configPath);
        const basePath = node_path_1.default.dirname(jsonPath ? jsonPath : configPath);
        let baseFinder = void 0;
        if (jsonPath) {
          baseFinder = createFinderFromJson(jsonPath, keysPath);
        } else {
          const extension = node_path_1.default.extname(configPath).toLowerCase();
          if (extension === ".js" || extension === ".cjs") {
            baseFinder = createFinderFromJs(configPath);
          }
        }
        if (!baseFinder) {
          throw new Error(`Invalid external workspace config path: ${configPath}. Supported types are .json, .js, and .cjs`);
        }
        return createValidatingFinder(baseFinder, basePath);
      }
    }
  });

  // ../../packages/tools-workspaces/lib/external/options.js
  var require_options = __commonJS({
    "../../packages/tools-workspaces/lib/external/options.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getConfigurationOptions = getConfigurationOptions2;
      var configSettings = {
        configPath: {
          configKey: "externalWorkspacesConfig",
          description: `Path to the external dependencies provider, either './filename.json/key1/key2' or './src/lookup.js|.cjs' `,
          settingType: "string",
          defaultValue: "./package.json/external-workspaces"
        },
        enableLogging: {
          configKey: "externalWorkspacesEnableLogging",
          description: `Turn on debug logging and log output to plugin-external-workspaces.log`,
          settingType: "boolean",
          defaultValue: false
        },
        outputWorkspaces: {
          configKey: "externalWorkspacesOutputWorkspaces",
          description: "Output the workspaces for this repo to a .json file, suitable for consumption by the plugin in another repo",
          settingType: "string",
          defaultValue: ""
        }
      };
      function getConfigurationOptions2() {
        return configSettings;
      }
    }
  });

  // ../../packages/tools-workspaces/lib/external/output.js
  var require_output = __commonJS({
    "../../packages/tools-workspaces/lib/external/output.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.writeOutWorkspaces = writeOutWorkspaces2;
      var node_fs_1 = __importDefault(__require("fs"));
      var node_path_1 = __importDefault(__require("path"));
      var finder_1 = require_finder();
      var logging_1 = require_logging();
      function depsToArray(deps, sort) {
        const result = Object.entries(deps).map(([name, definition]) => ({
          name,
          ...definition
        }));
        return sort ? result.sort((a, b) => a.name.localeCompare(b.name)) : result;
      }
      function outputDepsArray(deps, container) {
        for (const { name, ...definition } of deps) {
          container[name] = definition;
        }
      }
      function depsEqual(oldDeps, newDeps) {
        return oldDeps.length === newDeps.length && oldDeps.every((def, index) => def.name === newDeps[index].name && def.path === newDeps[index].path && def.version === newDeps[index].version);
      }
      function writeOutWorkspaces2(workspaces, outputPath) {
        const { jsonPath, keysPath } = (0, finder_1.parseJsonPath)(outputPath);
        if (!jsonPath) {
          throw new Error(`Invalid output path: ${outputPath}`);
        }
        const jsonDir = node_path_1.default.dirname(node_path_1.default.resolve(jsonPath));
        const newDeps = depsToArray(workspaces, true);
        for (const dep of newDeps) {
          if (dep.path) {
            dep.path = node_path_1.default.relative(jsonDir, dep.path);
          }
        }
        const parsedJson = node_fs_1.default.existsSync(jsonPath) ? JSON.parse(node_fs_1.default.readFileSync(jsonPath, "utf8")) : {};
        const parsedDeps = (0, finder_1.getDepsFromJson)(parsedJson, keysPath);
        if (parsedDeps && depsEqual(newDeps, depsToArray(parsedDeps))) {
          (0, logging_1.trace)(`No changes to ${jsonPath}, skipping update`);
          return;
        }
        const keys = keysPath ? keysPath.split("/") : [];
        const newJson = keys.length > 0 ? parsedJson : {};
        let current = newJson;
        let key = keys.shift();
        while (key) {
          if (!current[key] || keys.length === 0) {
            current[key] = {};
          }
          current = current[key];
          key = keys.shift();
        }
        outputDepsArray(newDeps, current);
        const jsonOutput = JSON.stringify(newJson, null, 2);
        node_fs_1.default.writeFileSync(jsonPath, jsonOutput);
        (0, logging_1.trace)(`Updated ${jsonPath}`);
      }
    }
  });

  // ../../packages/tools-workspaces/lib/external/settings.js
  var require_settings = __commonJS({
    "../../packages/tools-workspaces/lib/external/settings.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getYarnOption = getYarnOption;
      exports.getSettingsFromRepo = getSettingsFromRepo;
      var node_child_process_1 = __require("child_process");
      var node_fs_1 = __importDefault(__require("fs"));
      var node_path_1 = __importDefault(__require("path"));
      var finder_1 = require_finder();
      var options_1 = require_options();
      async function getYarnOption(option, cwd = process.cwd()) {
        return new Promise((resolve) => {
          (0, node_child_process_1.exec)(`yarn config get ${option}`, { cwd }, (error, stdout, stderr) => {
            if (error || stderr) {
              resolve(void 0);
            } else {
              resolve(stdout.trim());
            }
          });
        });
      }
      var repoSettings = void 0;
      async function getSettingsFromRepo(rootPath) {
        if (repoSettings) {
          return repoSettings;
        }
        if (!rootPath) {
          throw new Error("No workspace root specified");
        }
        const isYarn = node_fs_1.default.existsSync(node_path_1.default.join(rootPath, "yarn.lock"));
        if (!isYarn) {
          throw new Error("External workspaces is only supported in yarn workspaces");
        }
        const configPathEntry = (0, options_1.getConfigurationOptions)().configPath;
        const configPathFromYarn = await getYarnOption(configPathEntry.configKey, rootPath);
        const configPath = node_path_1.default.resolve(rootPath, configPathFromYarn ?? configPathEntry.defaultValue);
        return repoSettings = {
          configPath,
          enableLogging: false,
          outputWorkspaces: "",
          finder: (0, finder_1.loadConfigFile)(configPath)
        };
      }
    }
  });

  // ../../packages/tools-workspaces/lib/external/index.js
  var require_external = __commonJS({
    "../../packages/tools-workspaces/lib/external/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getSettingsFromRepo = exports.writeOutWorkspaces = exports.getConfigurationOptions = exports.trace = exports.enableLogging = exports.loadConfigFile = void 0;
      var finder_1 = require_finder();
      Object.defineProperty(exports, "loadConfigFile", { enumerable: true, get: function() {
        return finder_1.loadConfigFile;
      } });
      var logging_1 = require_logging();
      Object.defineProperty(exports, "enableLogging", { enumerable: true, get: function() {
        return logging_1.enableLogging;
      } });
      Object.defineProperty(exports, "trace", { enumerable: true, get: function() {
        return logging_1.trace;
      } });
      var options_1 = require_options();
      Object.defineProperty(exports, "getConfigurationOptions", { enumerable: true, get: function() {
        return options_1.getConfigurationOptions;
      } });
      var output_1 = require_output();
      Object.defineProperty(exports, "writeOutWorkspaces", { enumerable: true, get: function() {
        return output_1.writeOutWorkspaces;
      } });
      var settings_1 = require_settings();
      Object.defineProperty(exports, "getSettingsFromRepo", { enumerable: true, get: function() {
        return settings_1.getSettingsFromRepo;
      } });
    }
  });

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/configuration.ts
  var import_external = __toESM(require_external());
  var import_core = __require("@yarnpkg/core");
  function typeStringToSettingsType(type) {
    switch (type) {
      case "string":
        return import_core.SettingsType.STRING;
      case "boolean":
        return import_core.SettingsType.BOOLEAN;
      default:
        throw new Error(`Unknown type ${type}`);
    }
  }
  function getConfiguration() {
    const configSettings = (0, import_external.getConfigurationOptions)();
    return Object.fromEntries(
      Object.entries(configSettings).map(([_key, setting]) => [
        setting.configKey,
        {
          description: setting.description,
          type: typeStringToSettingsType(setting.settingType),
          default: setting.defaultValue
        }
      ])
    );
  }
  function getStringSetting(configuration, entry) {
    const value = configuration.get(entry.configKey);
    return value && typeof value === "string" ? value : entry.defaultValue;
  }
  function getBooleanSetting(configuration, entry) {
    const value = configuration.get(entry.configKey);
    return value !== void 0 ? Boolean(value) : entry.defaultValue;
  }
  var settings = void 0;
  function getSettingsFromProject(project) {
    if (!settings) {
      const base = (0, import_external.getConfigurationOptions)();
      const configuration = project.configuration;
      const configPath = getStringSetting(configuration, base.configPath);
      const enableLogging = getBooleanSetting(configuration, base.enableLogging);
      const outputWorkspaces = getStringSetting(
        configuration,
        base.outputWorkspaces
      );
      const finder = (0, import_external.loadConfigFile)(configPath);
      if (enableLogging) {
        (0, import_external.enableLogging)();
      }
      settings = { configPath, enableLogging, outputWorkspaces, finder };
    }
    return settings;
  }

  // src/hooks.ts
  var import_external2 = __toESM(require_external());
  var import_core2 = __require("@yarnpkg/core");
  function afterAllInstalled(project, _options) {
    const { outputWorkspaces } = getSettingsFromProject(project);
    if (outputWorkspaces && outputWorkspaces.indexOf(".json") !== -1) {
      const deps = {};
      project.workspacesByIdent.forEach((workspace) => {
        const { name: ident, version, private: isPrivate } = workspace.manifest;
        if (ident && version && !isPrivate) {
          const name = import_core2.structUtils.stringifyIdent(ident);
          deps[name] = { version, path: workspace.cwd };
        }
      });
      (0, import_external2.writeOutWorkspaces)(deps, outputWorkspaces);
    }
  }

  // src/resolver.ts
  var import_external3 = __toESM(require_external());
  var import_core3 = __require("@yarnpkg/core");
  var { makeDescriptor, makeLocator, stringifyIdent } = import_core3.structUtils;
  var ExternalResolver = class {
    constructor() {
      this.finder = void 0;
      this.report = void 0;
      console.log("ExternalResolver constructor");
    }
    /**
     * Ensure a finder is created if it is not already present, then return it
     */
    getFinder(opts) {
      if (!this.finder) {
        this.finder = getSettingsFromProject(opts.project).finder;
      }
      return this.finder;
    }
    acceptsRange(diskVersion, range) {
      return diskVersion === range || import_core3.semverUtils.satisfiesWithPrereleases(diskVersion, range, true);
    }
    interceptDescriptor(descriptor, opts) {
      if (!opts.project.tryWorkspaceByDescriptor(descriptor)) {
        const name = stringifyIdent(descriptor);
        const info = this.getFinder(opts)(name);
        if (info) {
          (0, import_external3.trace)(`found package ${name} at path ${info.path}`);
        }
        if (info && info.path && this.acceptsRange(info.version, descriptor.range)) {
          (0, import_external3.trace)(`range accepted for ${name} with range ${descriptor.range}`);
          return info;
        }
      }
      return void 0;
    }
    /**
     * This function must return a set of other descriptors that must be
     * transformed into locators before the subject descriptor can be transformed
     * into a locator. This is typically only needed for transform packages, as
     * you need to know the original resolution in order to copy it.
     */
    getResolutionDependencies(_descriptor, _opts) {
      (0, import_external3.trace)(
        `UNEXPECTED: getResolutionDependencies called for ${stringifyIdent(_descriptor)}`
      );
      return {};
    }
    /**
     * This function must return true if the specified descriptor is meant to be
     * turned into a locator by this resolver. The other functions (except its
     * locator counterpart) won't be called if it returns false.
     *
     * @param descriptor The descriptor that needs to be validated.
     * @param opts The resolution options.
     */
    supportsDescriptor(descriptor, opts) {
      if (this.interceptDescriptor(descriptor, opts)) {
        (0, import_external3.trace)(
          `supportDescriptor success for ${stringifyIdent(descriptor)} : ${descriptor.range}`
        );
        return true;
      }
      return false;
    }
    /**
     * This function must return true if the specified locator is meant to be
     * turned into a package definition by this resolver. The other functions
     * (except its locator counterpart) won't be called if it returns false.
     *
     * @param locator The locator that needs to be validated.
     * @param opts The resolution options.
     */
    supportsLocator(_locator, _opts) {
      return false;
    }
    /**
     * This function indicates whether the package definition for the specified
     * locator must be kept between installs. You typically want to return true
     * for all packages that are cached, but return false for all packages that
     * hydrate packages directly from the filesystem (for example workspaces).
     *
     * Note that even packages returning false are stored within the lockfile!
     * The difference is that when a new install is done, all package definitions
     * that return false will be discarded and resolved again (their potential
     * cache data will be kept, though).
     *
     * @param locator The queried package.
     * @param opts The resolution options.
     */
    shouldPersistResolution(_locator, _opts) {
      return false;
    }
    /**
     * This function is called for each dependency present in the dependency list
     * of a package definition. If it returns a new descriptor, this new
     * descriptor will be used
     *
     * Note that `fromLocator` is not necessarily a locator that's supported by
     * the resolver. It simply is the locator of the package that depends on the
     * specified descriptor, regardless who owns it.
     *
     * In this case the descriptor is being transformed away from the external: protocol
     * to either portal: or npm: depending on whether the package is local or not
     *
     * @param descriptor The depended descriptor.
     * @param fromLocator The dependent locator.
     * @param opts The resolution options.
     */
    bindDescriptor(descriptor, _fromLocator, opts) {
      const info = this.interceptDescriptor(descriptor, opts);
      if (info && info.path) {
        (0, import_external3.trace)(
          `bindDescriptor transforming ${stringifyIdent(descriptor)} to "portal:${info.path}"`
        );
        return makeDescriptor(descriptor, `portal:${info.path}`);
      }
      return descriptor;
    }
    /**
     * This function will, given a descriptor, return the list of locators that
     * potentially satisfy it.
     *
     * The returned array must be sorted in such a way that the preferred
     * locators are first. This will cause the resolution algorithm to prioritize
     * them if possible (it doesn't guarantee that they'll end up being used).
     *
     * Note that because this protocol is routing to either portal or npm server this
     * should not be called but this is the minimum technically correct implementation
     *
     * @param descriptor The source descriptor.
     * @param dependencies The resolution dependencies and their resolutions.
     * @param opts The resolution options.
     */
    async getCandidates(descriptor, _dependencies, _opts) {
      (0, import_external3.trace)(`UNEXPECTED: getCandidates called for ${stringifyIdent(descriptor)}`);
      return [makeLocator(descriptor, descriptor.range)];
    }
    /**
     * This function will, given a descriptor and a list of locators,
     * find out which of the locators potentially satisfy the descriptor.
     *
     * This function is different from `getCandidates`, as `getCandidates` will
     * resolve the descriptor into a list of locators (potentially using the network),
     * while `getSatisfying` will statically compute which known references potentially
     * satisfy the target descriptor.
     *
     * Note that the parameter references aren't guaranteed to be supported by
     * the resolver, so they'll probably need to be filtered beforehand.
     *
     * The returned array should be sorted in such a way that the preferred
     * locators are first. This will cause the resolution algorithm to prioritize
     * them if possible (it doesn't guarantee that they'll end up being used). If
     * the resolver is unable to provide a definite order (for example like the
     * `file:` protocol resolver, where ordering references would make no sense),
     * the `sorted` field should be set to `false`.
     *
     * @param descriptor The target descriptor.
     * @param dependencies The resolution dependencies and their resolutions.
     * @param locators The candidate locators.
     * @param opts The resolution options.
     */
    async getSatisfying(descriptor, dependencies, locators, opts) {
      this.report ??= opts.report;
      (0, import_external3.trace)(
        `UNEXPECTEDP: getSatisfying called for ${stringifyIdent(descriptor)}`
      );
      const [locator] = await this.getCandidates(descriptor, dependencies, opts);
      return {
        locators: locators.filter(
          (candidate) => candidate.locatorHash === locator.locatorHash
        ),
        sorted: false
      };
    }
    /**
     * This function will, given a locator, return the full package definition
     * for the package pointed at. This shouldn't be called for a transforming protocol
     *
     * @param locator The source locator.
     * @param opts The resolution options.
     */
    async resolve(locator, opts) {
      this.report ??= opts.report;
      (0, import_external3.trace)(`UNEXPECTED: Resolving external locator ${stringifyIdent(locator)}`);
      return {
        ...locator,
        name: locator.name,
        version: "0.0.0",
        languageName: "unknown",
        conditions: null
      };
    }
  };

  // src/index.ts
  var plugin = {
    /**
     * Add a new configurable setting in yarn's configuration.
     */
    configuration: getConfiguration(),
    /**
     * Hook up the custom resolver
     */
    resolvers: [ExternalResolver],
    /**
     * Add a hook to write out the workspaces if requested
     */
    hooks: {
      afterAllInstalled
    }
  };
  var index_default = plugin;
  return __toCommonJS(index_exports);
})();
return plugin;
}
};
//# sourceMappingURL=external-workspaces.cjs.map
