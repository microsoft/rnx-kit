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

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/cofiguration.ts
  var import_core = __require("@yarnpkg/core");
  var import_fslib = __require("@yarnpkg/fslib");
  var import_node_fs = __toESM(__require("fs"));
  var providerKey = "externalWorkspacesProvider";
  var outputPathKey = "externalWorkspacesOutputPath";
  var outputOnlyOnCommandKey = "externalWorkspacesOutputOnlyOnCommand";
  var externalWorkspacesConfiguration = {
    [providerKey]: {
      description: `Relative path to a .json file of shape WorkspaceOutputJson or a .js file that exports a function of type DefinitionFinder as the default export`,
      type: import_core.SettingsType.STRING,
      default: null
    },
    [outputPathKey]: {
      description: `Relative path to a .json file where workspace info should be recorded. If a directory is provided the file will pick up the name from the root package.json`,
      type: import_core.SettingsType.STRING,
      default: null
    },
    [outputOnlyOnCommandKey]: {
      description: `Suppress writing out the workspaces on install and only write them out when the command is invoked`,
      type: import_core.SettingsType.BOOLEAN,
      default: false
    }
  };
  function getPluginConfiguration(configuration) {
    const provider = import_fslib.npath.toPortablePath(
      configuration.get(providerKey) || ""
    );
    const outputPath = import_fslib.npath.toPortablePath(
      configuration.get(outputPathKey) || ""
    );
    const outputOnlyOnCommand = Boolean(
      configuration.get(outputOnlyOnCommandKey)
    );
    return { provider, outputPath, outputOnlyOnCommand };
  }
  function getFinderFromJsonConfig(jsonPath) {
    if (!import_node_fs.default.existsSync(jsonPath)) {
      throw new Error(
        `Unable to find external workspaces definition file ${jsonPath}`
      );
    }
    const generated = JSON.parse(import_node_fs.default.readFileSync(jsonPath, "utf8"))?.generated || {};
    const { repoPath = "", workspaces = {} } = generated;
    const toRepo = import_fslib.npath.toPortablePath(repoPath);
    return (pkgName) => {
      const pkgPath = workspaces[pkgName];
      if (pkgPath) {
        return {
          path: import_fslib.ppath.join(toRepo, import_fslib.npath.toPortablePath(pkgPath))
        };
      }
      return null;
    };
  }
  function getFinderFromJsConfig(jsPath) {
    if (!import_node_fs.default.existsSync(jsPath)) {
      throw new Error(
        `Unable to find external workspaces definition file ${jsPath}`
      );
    }
    const finder = __require(jsPath).default;
    if (typeof finder !== "function") {
      throw new Error(
        `External workspaces definition file ${jsPath} does not export a function as default`
      );
    }
    return finder;
  }

  // src/fetcher.ts
  var import_fslib3 = __require("@yarnpkg/fslib");

  // src/tracker.ts
  var import_core3 = __require("@yarnpkg/core");
  var import_fslib2 = __require("@yarnpkg/fslib");

  // src/utilities.ts
  var import_core2 = __require("@yarnpkg/core");
  var externalProtocol = "external:";
  var remoteProtocol = "fallback:";
  function getProtocol() {
    return externalProtocol;
  }
  function getRemoteProtocol() {
    return remoteProtocol;
  }
  function decodeDescriptorRange(range) {
    const protocolEnd = range.indexOf(":");
    if (protocolEnd !== -1) {
      return {
        protocol: range.slice(0, protocolEnd + 1),
        version: range.slice(protocolEnd + 1)
      };
    }
    return { protocol: "", version: range };
  }
  function coerceDescriptorTo(descriptor, newProtocol) {
    const { protocol, version } = decodeDescriptorRange(descriptor.range);
    if (protocol === newProtocol) {
      return descriptor;
    }
    return import_core2.structUtils.makeDescriptor(descriptor, `${newProtocol}${version}`);
  }
  function coerceLocatorTo(locator, newProtocol) {
    const { protocol, version } = decodeDescriptorRange(locator.reference);
    if (protocol === newProtocol) {
      return locator;
    }
    return import_core2.structUtils.makeLocator(locator, `${newProtocol}${version}`);
  }

  // src/workspace.ts
  var localProtocol = getProtocol();
  var remoteProtocol2 = getRemoteProtocol();
  var fallbackProtocol = "npm:";
  var protocolsLocal = [localProtocol, remoteProtocol2, fallbackProtocol];
  var keysLocal = protocolsLocal.map((p) => p.slice(0, -1) + "Dependency");
  var protocolsRemote = [remoteProtocol2, localProtocol, fallbackProtocol];
  var keysRemote = protocolsRemote.map((p) => p.slice(0, -1) + "Dependency");
  var ExternalWorkspace = class {
    constructor(name, prettyName, localPath, trace) {
      this.packages = [null, null, null];
      this.localIndex = 0;
      this.remoteIndex = 1;
      this.fallbackIndex = 2;
      this.name = name;
      this.localPath = localPath;
      this.isLocal = !!localPath;
      this.prettyName = prettyName;
      this.trace = trace;
      this.protocols = this.isLocal ? protocolsLocal : protocolsRemote;
      this.dependentKeys = this.isLocal ? keysLocal : keysRemote;
      if (!this.isLocal) {
        this.localIndex = 1;
        this.remoteIndex = 0;
      }
    }
    getResolutionDependencies(descriptor, resolverType) {
      const childIndex = this.indexFromResolverType(resolverType) + 1;
      return {
        [this.dependentKeys[childIndex]]: this.transformDescriptor(
          descriptor,
          childIndex
        )
      };
    }
    async getCandidates(descriptor, dependencies, opts, resolverType) {
      const index = this.indexFromResolverType(resolverType);
      const [childDependencies, childPackage] = this.getNextDependencies(
        dependencies,
        index
      );
      const resolver = opts.resolver;
      const childDescriptor = this.transformDescriptor(descriptor, index + 1);
      const childLocators = await resolver.getCandidates(
        childDescriptor,
        childDependencies,
        opts
      );
      const foundChildLocators = childLocators.length > 0;
      if (foundChildLocators && childPackage) {
        childLocators.push(childPackage);
      }
      if (index === 0 || childLocators.length === 0) {
        this.trace(
          `${this.prettyName}: getCandidates: (${resolverType}) found ${childLocators.length} locators from ${foundChildLocators ? "child" : "package"}`
        );
      }
      return this.transformLocators(
        childLocators,
        this.resolverLocatorIndex(resolverType)
      );
    }
    async getSatisfying(descriptor, dependencies, locators, opts, resolverType) {
      const index = this.indexFromResolverType(resolverType);
      const childIndex = index + 1;
      const [childDependencies] = this.getNextDependencies(dependencies, index);
      const childDescriptor = this.transformDescriptor(descriptor, childIndex);
      const childLocators = this.transformLocators(locators, childIndex);
      const resolver = opts.resolver;
      const results = await resolver.getSatisfying(
        childDescriptor,
        childDependencies,
        childLocators,
        opts
      );
      const locatorIndex = this.resolverLocatorIndex(resolverType);
      if (locatorIndex !== childIndex) {
        results.locators = this.transformLocators(results.locators, locatorIndex);
      }
      if (index === 0 || results.locators.length === 0) {
        this.trace(
          `${this.prettyName}: getSatisfying (${resolverType}) found ${results.locators.length} locators from ${locators.length} inputs`
        );
      }
      return results;
    }
    toFallbackLocator(locator) {
      return this.transformLocator(locator, this.fallbackIndex);
    }
    toLeadDescriptor(descriptor) {
      return this.transformDescriptor(descriptor, 0);
    }
    indexFromResolverType(resolverType) {
      return resolverType === "local" ? this.localIndex : this.remoteIndex;
    }
    resolverLocatorIndex(resolverType) {
      return resolverType === "local" ? this.localIndex : this.fallbackIndex;
    }
    transformDescriptor(descriptor, index) {
      return coerceDescriptorTo(descriptor, this.protocols[index]);
    }
    transformLocator(locator, index) {
      return coerceLocatorTo(locator, this.protocols[index]);
    }
    transformLocators(locators, index) {
      return locators.map((locator) => this.transformLocator(locator, index));
    }
    getNextDependencies(dependencies, thisIndex) {
      const childIndex = thisIndex + 1;
      const nextPackage = dependencies[this.dependentKeys[childIndex]];
      if (nextPackage && this.packages[childIndex] === null) {
        this.packages[childIndex] = nextPackage;
      }
      const childPackage = this.packages[childIndex];
      const childDependencies = {};
      if (childPackage) {
        childDependencies[this.dependentKeys[childIndex]] = childPackage;
      }
      return [childDependencies, childPackage];
    }
  };

  // src/tracker.ts
  var nullFunction = (_val) => null;
  var ExternalWorkspaceTracker = class {
    constructor(project) {
      this.trace = nullFunction;
      this.workspaceMap = /* @__PURE__ */ new Map();
      this.workspaceByIdent = /* @__PURE__ */ new Map();
      this.notExternal = /* @__PURE__ */ new Set();
      this.npmPackageByIdent = /* @__PURE__ */ new Map();
      this.resolver = null;
      this.fetcher = null;
      this.findPackage = nullFunction;
      this.trace = nullFunction;
      this.report = (msg) => console.log(msg);
      this.root = project.cwd;
      this.project = project;
      const { provider } = getPluginConfiguration(project.configuration);
      if (provider) {
        if (provider.endsWith(".json")) {
          this.findPackage = getFinderFromJsonConfig(provider);
        } else if (provider.endsWith(".js") || provider.endsWith(".cjs")) {
          this.findPackage = getFinderFromJsConfig(provider);
        }
      }
    }
    tryNameLookup(pkgName) {
      return this.workspaceMap.get(pkgName) || null;
    }
    createWorkspace(name, localPath) {
      const prettyName = import_core3.structUtils.prettyIdent(
        this.project.configuration,
        import_core3.structUtils.parseIdent(name)
      );
      return new ExternalWorkspace(
        name,
        prettyName,
        import_fslib2.npath.toPortablePath(localPath),
        this.trace
      );
    }
    /**
     * Lookup and load a workspace for an ident, assumes that:
     * - it is not in our lookup caches
     * - it is not a regular workspace
     * - we have not looked it up before
     *
     * @param ident the ident to try to load if it is an external workspace
     * @returns a loaded ExternalWorkspace or null if not found
     */
    tryIdentLoad(ident) {
      const pkgName = import_core3.structUtils.stringifyIdent(ident);
      let workspace = this.tryNameLookup(pkgName);
      if (workspace) {
        this.workspaceByIdent.set(ident.identHash, workspace);
        return workspace;
      }
      const pkgInfo = this.findPackage(pkgName);
      if (pkgInfo) {
        workspace = this.createWorkspace(pkgName, pkgInfo.path || "");
        this.trace(
          `Loaded external workspace ${workspace.prettyName} of type ${pkgInfo.path ? "LOCAL" : "REMOTE"}`
        );
        this.workspaceMap.set(pkgName, workspace);
        this.workspaceByIdent.set(ident.identHash, workspace);
        return workspace;
      }
      this.notExternal.add(ident.identHash);
      return null;
    }
    setFallbackPackage(descriptor, pkg) {
      this.npmPackageByIdent.set(descriptor.identHash, pkg);
    }
    getFallbackPackage(descriptor) {
      return this.npmPackageByIdent.get(descriptor.identHash);
    }
    /**
     * See if the descriptor references an external workspace, trying the cache first, before doing a real lookup
     * @param descriptor the descriptor to try to find
     * @returns a Workspace if this is an external workspace, or null
     */
    tryByDescriptor(descriptor) {
      if (this.workspaceByIdent.has(descriptor.identHash)) {
        return this.workspaceByIdent.get(descriptor.identHash);
      }
      if (this.notExternal.has(descriptor.identHash) || this.project.tryWorkspaceByDescriptor(descriptor)) {
        return null;
      }
      return this.tryIdentLoad(descriptor);
    }
    findByDescriptor(descriptor) {
      const workspace = this.tryByDescriptor(descriptor);
      if (!workspace) {
        throw new Error(
          `Cannot find workspace for descriptor ${import_core3.structUtils.stringifyDescriptor(
            descriptor
          )}`
        );
      }
      return workspace;
    }
    /**
     * See if the locator references an external workspace, trying the cache first, before doing a real lookup
     * @param locator the descriptor to try to find
     * @returns a Workspace if this is an external workspace, or null
     */
    tryByLocator(locator) {
      if (this.workspaceByIdent.has(locator.identHash)) {
        return this.workspaceByIdent.get(locator.identHash);
      }
      if (this.notExternal.has(locator.identHash) || this.project.tryWorkspaceByLocator(locator)) {
        return null;
      }
      return this.tryIdentLoad(locator);
    }
    findByLocator(locator) {
      const workspace = this.tryByLocator(locator);
      if (!workspace) {
        throw new Error(
          `Cannot find workspace for locator ${import_core3.structUtils.stringifyLocator(
            locator
          )}`
        );
      }
      return workspace;
    }
    getResolver() {
      this.resolver ??= this.project.configuration.makeResolver();
      return this.resolver;
    }
    getFetcher() {
      this.fetcher ??= this.project.configuration.makeFetcher();
      return this.fetcher;
    }
  };
  var workspaceTracker = null;
  function getWorkspaceTracker(project) {
    if (!workspaceTracker) {
      workspaceTracker = new ExternalWorkspaceTracker(project);
    }
    return workspaceTracker;
  }

  // src/fetcher.ts
  var ExternalFetcher = class _ExternalFetcher {
    constructor() {
      this.tracker = null;
    }
    static {
      this.protocol = getProtocol();
    }
    ensureTracker(opts) {
      if (!this.tracker) {
        this.tracker = getWorkspaceTracker(opts.project);
      }
      return this.tracker;
    }
    /**
     * This function must return true if the specified locator is understood by
     * this resolver (only its syntax is checked, it doesn't have to be valid
     * and it's fine if the `fetch` ends up returning a 404).
     *
     * @param locator The locator that needs to be validated.
     * @param opts The fetch options.
     */
    supports(locator, _opts) {
      return locator.reference.startsWith(_ExternalFetcher.protocol);
    }
    /**
     * This function must return the local path for the given package. The local
     * path is the one that's used to resolve relative dependency sources, for
     * example "file:./foo".
     *
     * @param locator The source locator.
     * @param opts The fetch options.
     */
    getLocalPath(locator, opts) {
      const workspace = this.ensureTracker(opts).findByLocator(locator);
      if (workspace.localPath) {
        return workspace.localPath;
      }
      return null;
    }
    /**
     * Fetch results for locally existing packages. This is a LinkType.SOFT fetcher, though we do
     * fall through and return the hard link style results from the fallback fetcher. This is OK as
     * those results won't be installed.
     *
     * @param locator The source locator.
     * @param opts The fetch options.
     */
    async fetch(locator, opts) {
      const tracker = this.ensureTracker(opts);
      const workspace = tracker.findByLocator(locator);
      if (workspace.localPath) {
        const localPath = import_fslib3.ppath.resolve(tracker.root, workspace.localPath);
        return {
          packageFs: new import_fslib3.CwdFS(import_fslib3.PortablePath.root),
          prefixPath: localPath,
          localPath
        };
      }
      return await this.fetchFallback(locator, opts, workspace);
    }
    /**
     * Return fetch results from the fallback fetcher. This is likely the npm: fetcher but could potentially be
     * any hardlink based fetcher, though implementing that may require not offloading the locator/candidate chaining.
     *
     * Trim checksum value so it isn't recorded in the lockfile for the external protocol entry
     *
     * @param locator source locator for this fetch operation
     * @param opts fetch options
     * @param workspace loaded workspace for this locator
     * @returns results from the fallback fetcher, likely the npm: fetcher
     */
    async fetchFallback(locator, opts, workspace) {
      const fallbackLocator = workspace.toFallbackLocator(locator);
      const fetcher = opts.fetcher;
      const results = await fetcher.fetch(fallbackLocator, opts);
      delete results.checksum;
      return results;
    }
  };

  // src/hooks.ts
  var import_fslib5 = __require("@yarnpkg/fslib");

  // src/outputCommand.ts
  var import_cli = __require("@yarnpkg/cli");
  var import_core4 = __require("@yarnpkg/core");
  var import_fslib4 = __require("@yarnpkg/fslib");
  var import_clipanion = __require("clipanion");
  var import_node_fs2 = __toESM(__require("fs"));
  var OutputWorkspaces = class extends import_cli.BaseCommand {
    constructor() {
      super(...arguments);
      this.target = import_clipanion.Option.String("--target", "", {
        description: "The path to the file to output the workspaces to"
      });
      this.checkOnly = import_clipanion.Option.Boolean("--check-only", false, {
        description: "Check if the workspaces have changed without writing the file"
      });
      this.includePrivate = import_clipanion.Option.Boolean("--include-private", false, {
        description: "Include private workspaces in the output"
      });
    }
    static {
      this.paths = [["external-workspaces", "output"]];
    }
    static {
      this.usage = import_clipanion.Command.Usage({
        category: "External Workspaces",
        description: "Output current workspace information to a json file",
        details: `
      This command will output the current set of workspaces to a json file. The file will not be modified if the workspaces have not changed.

      The path to the .json file can optionally have a set of keys appended to the end as a path. This will write the workspaces to a subpath of
      the file while maintaining the other contents of the file.
    `,
        examples: [
          [
            "Output workspaces with settings from package.json",
            "$0 external-workspaces output"
          ],
          [
            "Output workspaces to target",
            "$0 external-workspaces output --target ./path/to/file.json"
          ],
          [
            "Output workspaces to target with a subpath",
            "$0 external-workspaces output --target ./path/to/file.json/key1/key2"
          ],
          [
            "Check if workspaces have changed",
            "$0 external-workspaces output --target ./path/to/file.json --check-only"
          ]
        ]
      });
    }
    async execute() {
      const { quiet, stdout } = this.context;
      const report = quiet ? () => null : (msg) => stdout.write(`${msg}
`);
      const configuration = await import_core4.Configuration.find(
        this.context.cwd,
        this.context.plugins
      );
      const settings = getPluginConfiguration(configuration);
      const { project } = await import_core4.Project.find(configuration, this.context.cwd);
      const outputPath = this.target || settings.outputPath;
      if (!outputPath) {
        throw new import_clipanion.UsageError(
          `No output path specified in configuration or command. Use --target to specify a path`
        );
      }
      stdout.write;
      await outputWorkspaces(
        project,
        import_fslib4.npath.toPortablePath(outputPath),
        this.checkOnly,
        report
      );
    }
  };
  function outputWorkspaces(project, outputPath, checkOnly, report) {
    const includesJson = outputPath.endsWith(".json");
    const outputDir = includesJson ? import_fslib4.ppath.dirname(outputPath) : outputPath;
    const outputFile = includesJson ? import_fslib4.ppath.basename(outputPath) : fallbackOutputFilename(project.cwd);
    if (!checkOnly && !import_node_fs2.default.existsSync(outputDir)) {
      import_node_fs2.default.mkdirSync(outputDir, { recursive: true });
    }
    const fullPath = import_fslib4.npath.join(import_fslib4.npath.fromPortablePath(outputDir), outputFile);
    const workspaces = {};
    project.workspacesByIdent.forEach((workspace) => {
      const { name: ident, private: isPrivate } = workspace.manifest;
      if (ident && !isPrivate) {
        const name = import_core4.structUtils.stringifyIdent(ident);
        workspaces[name] = import_fslib4.ppath.relative(project.cwd, workspace.cwd);
      }
    });
    const repoPath = import_fslib4.ppath.relative(outputDir, project.cwd);
    const generated = {
      repoPath,
      workspaces: sortStringRecord(workspaces)
    };
    const parsedJson = import_node_fs2.default.existsSync(fullPath) ? JSON.parse(import_node_fs2.default.readFileSync(fullPath, "utf8")) : {};
    const oldGenerated = parsedJson.generated || {};
    const oldRepoPath = oldGenerated.repoPath || "";
    const changes = findDependencyChanges(oldGenerated.workspaces, workspaces);
    if (changes || repoPath !== oldRepoPath) {
      if (checkOnly) {
        reportDependencyChanges(fullPath, oldRepoPath, repoPath, changes, report);
      } else {
        parsedJson.generated = generated;
        const jsonOutput = JSON.stringify(parsedJson, null, 2);
        import_node_fs2.default.writeFileSync(fullPath, jsonOutput);
        report(`Updated workspaces in ${fullPath}`);
      }
    }
  }
  function reportDependencyChanges(jsonPath, pathOld, pathNew, changes, report) {
    report(`Updates needed for ${jsonPath}:`);
    if (pathOld !== pathNew) {
      report(`Repo path has changed from ${pathOld} to ${pathNew}`);
    }
    if (changes) {
      for (const name in changes) {
        const change = String(changes[name]).padEnd(6, " ");
        report(`${change} - ${name}`);
      }
    }
  }
  function findDependencyChanges(oldDeps, newDeps) {
    const changes = {};
    for (const name in newDeps) {
      if (oldDeps[name]) {
        if (oldDeps[name] !== newDeps[name]) {
          changes[name] = "update";
        }
      } else {
        changes[name] = "add";
      }
    }
    for (const name in oldDeps) {
      if (!newDeps[name]) {
        changes[name] = "remove";
      }
    }
    return Object.keys(changes).length > 0 ? changes : null;
  }
  function sortStringRecord(toSort) {
    const sortedKeys = Object.keys(toSort).sort();
    const target = {};
    for (const key of sortedKeys) {
      target[key] = toSort[key];
    }
    return target;
  }
  function fallbackOutputFilename(root) {
    const packageJson = import_fslib4.ppath.join(root, "package.json");
    if (import_node_fs2.default.existsSync(packageJson)) {
      const pkg = JSON.parse(import_node_fs2.default.readFileSync(packageJson, "utf8"));
      if (pkg.name && typeof pkg.name === "string") {
        return pkg.name.replace(/[^a-zA-Z0-9@._]/g, "-") + "-workspaces.json";
      }
    }
    return "workspaces.json";
  }

  // src/hooks.ts
  function afterAllInstalled(project, options) {
    const settings = getPluginConfiguration(project.configuration);
    if (!settings.outputOnlyOnCommand && settings.outputPath) {
      const report = (msg) => options.report.reportInfo(null, msg);
      outputWorkspaces(
        project,
        import_fslib5.npath.toPortablePath(settings.outputPath),
        false,
        report
      );
    }
  }
  async function reduceDependency(dependency, project, _locator, _initialDependency, _extra) {
    const tracker = getWorkspaceTracker(project);
    const workspace = tracker.tryByDescriptor(dependency);
    if (workspace) {
      return workspace.toLeadDescriptor(dependency);
    }
    return dependency;
  }

  // src/resolvers.ts
  var import_core5 = __require("@yarnpkg/core");
  var ResolverBase = class {
    constructor(resolverType, protocol) {
      this.tracker = null;
      this.resolverType = resolverType;
      this.protocol = protocol;
    }
    /**
     * Ensure a finder is created if it is not already present, then return it
     */
    ensureTracker(opts) {
      if (!this.tracker) {
        this.tracker = getWorkspaceTracker(opts.project);
      }
      return this.tracker;
    }
    /**
     * Force resolution of a different package to happen before this package is resolved.
     */
    getResolutionDependencies(descriptor, opts) {
      const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
      return workspace.getResolutionDependencies(descriptor, this.resolverType);
    }
    /**
     * Do we support these descriptors, in particular turning them into locators
     */
    supportsDescriptor(descriptor, _opts) {
      return descriptor.range.startsWith(this.protocol);
    }
    /**
     * Do we support locators of this type, effectively will this resolve
     */
    supportsLocator(locator, _opts) {
      return locator.reference.startsWith(this.protocol);
    }
    /**
     * Persist resolution between installs, false for places where we will pick it up from local. If this
     * was true we would only fetch if a checksum of sorts changes.
     */
    shouldPersistResolution(_locator, _opts) {
      return false;
    }
    /**
     * Chance to transform a descriptor to another type, has lockfile implications and actually removes this descriptor from
     * the resolution chain in the lockfile.
     */
    bindDescriptor(descriptor, _fromLocator, _opts) {
      return descriptor;
    }
    /**
     * This is the driver for turning descriptors into locators, creating them if necessary. In npm resolution it will do
     * things like comparing semver ranges. Descriptors can have a semver range, where locators need to settle on a particular
     * resolution and be specific.
     */
    async getCandidates(descriptor, dependencies, opts) {
      const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
      return await workspace.getCandidates(
        descriptor,
        dependencies,
        opts,
        this.resolverType
      );
    }
    /**
     * Given a set of locators, usually found via getCandidates, which ones satisfy this descriptor and which one
     * should be chosen. It returns an array but typically will select entry [0] as the best candidate, whether
     * sorted is set or not. This locator then feeds into resolve
     */
    async getSatisfying(descriptor, dependencies, locators, opts) {
      const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
      return await workspace.getSatisfying(
        descriptor,
        dependencies,
        locators,
        opts,
        this.resolverType
      );
    }
    /**
     * Build the full package for this locator, this is cached and used for install and also is used for
     * lockfile generation.
     */
    async resolve(locator, opts) {
      const tracker = this.ensureTracker(opts);
      const errorMsg = `UNEXPECTED: resolve called for ${import_core5.structUtils.stringifyLocator(
        locator
      )} in ${this.resolverType} resolver`;
      tracker.trace(errorMsg);
      throw new Error(errorMsg);
    }
  };
  var FallbackResolver = class _FallbackResolver extends ResolverBase {
    static {
      this.protocol = getRemoteProtocol();
    }
    constructor() {
      super("remote", _FallbackResolver.protocol);
    }
  };
  var ExternalResolver = class _ExternalResolver extends ResolverBase {
    static {
      this.protocol = getProtocol();
    }
    constructor() {
      super("local", _ExternalResolver.protocol);
    }
    /**
     * This function will, given a locator, return the full package definition
     * for the package pointed at. Note that this should only be called for packages which are
     * locally available, for remote ones they should fall through to a different resolver/fetcher.
     *
     * @param locator The source locator.
     * @param opts The resolution options.
     */
    async resolve(locator, opts) {
      const emptyManifest = new import_core5.Manifest();
      return {
        ...emptyManifest,
        ...locator,
        version: "0.0.0",
        languageName: opts.project.configuration.get("defaultLanguageName"),
        linkType: import_core5.LinkType.SOFT
      };
    }
  };

  // src/index.ts
  var plugin = {
    configuration: {
      ...externalWorkspacesConfiguration
    },
    /**
     * Hook up the custom fetcher and resolver
     */
    fetchers: [ExternalFetcher],
    resolvers: [ExternalResolver, FallbackResolver],
    /**
     * Add a hook to write out the workspaces if requested
     */
    hooks: {
      afterAllInstalled,
      reduceDependency
    },
    commands: [OutputWorkspaces]
  };
  var index_default = plugin;
  return __toCommonJS(index_exports);
})();
return plugin;
}
};
//# sourceMappingURL=external-workspaces.cjs.map
