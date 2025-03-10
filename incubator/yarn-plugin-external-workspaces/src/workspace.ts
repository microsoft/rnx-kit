import {
  type Descriptor,
  type Locator,
  type Package,
  type ResolveOptions,
} from "@yarnpkg/core";
import { type PortablePath } from "@yarnpkg/fslib";
import {
  coerceDescriptorTo,
  coerceLocatorTo,
  getProtocol,
  getRemoteProtocol,
} from "./utilities";

const localProtocol = getProtocol();
const remoteProtocol = getRemoteProtocol();
const fallbackProtocol = "npm:";

const protocolsLocal = [localProtocol, remoteProtocol, fallbackProtocol];
const keysLocal = protocolsLocal.map((p) => p.slice(0, -1) + "Dependency");
const protocolsRemote = [remoteProtocol, localProtocol, fallbackProtocol];
const keysRemote = protocolsRemote.map((p) => p.slice(0, -1) + "Dependency");

type Dependencies = Record<string, Package>;
type TraceFunc = (msg: string) => void;
export type ResolverType = "local" | "remote";

export class ExternalWorkspace {
  name: string;
  prettyName: string;
  localPath: PortablePath | undefined;
  isLocal: boolean;

  private protocols: string[];
  private dependentKeys: string[];
  private packages: (Package | null)[] = [null, null, null];
  private localIndex = 0;
  private remoteIndex = 1;
  private fallbackIndex = 2;
  private trace: TraceFunc;

  constructor(
    name: string,
    prettyName: string,
    localPath: PortablePath,
    trace: TraceFunc
  ) {
    this.name = name;
    this.localPath = localPath;
    this.isLocal = !!localPath;
    this.prettyName = prettyName;
    this.trace = trace;

    // create ident and descriptors for this workspace, use * to resolve everything to one outcome, ideally latest
    this.protocols = this.isLocal ? protocolsLocal : protocolsRemote;
    this.dependentKeys = this.isLocal ? keysLocal : keysRemote;
    if (!this.isLocal) {
      this.localIndex = 1;
      this.remoteIndex = 0;
    }
  }

  getResolutionDependencies(
    descriptor: Descriptor,
    resolverType: ResolverType
  ) {
    const childIndex = this.indexFromResolverType(resolverType) + 1;
    return {
      [this.dependentKeys[childIndex]]: this.transformDescriptor(
        descriptor,
        childIndex
      ),
    };
  }

  async getCandidates(
    descriptor: Descriptor,
    dependencies: Dependencies,
    opts: ResolveOptions,
    resolverType: ResolverType
  ) {
    const index = this.indexFromResolverType(resolverType);

    // set up the child dependencies and package, if it is available
    const [childDependencies, childPackage] = this.getNextDependencies(
      dependencies,
      index
    );

    // next call through the resolver to get the candidates from the child, these will effectively chain through the resolvers
    const resolver = opts.resolver;
    const childDescriptor = this.transformDescriptor(descriptor, index + 1);

    // call the next resolver in the chain, this will end up at the fallback resolver allowing all the semver coalescing from the npm
    // registry to flow back up the chain
    const childLocators = await resolver.getCandidates(
      childDescriptor,
      childDependencies,
      opts
    );
    const foundChildLocators = childLocators.length > 0;

    // if getCandidates returned nothing, use the childPackage (which contains a locator) as the fallback
    if (foundChildLocators && childPackage) {
      childLocators.push(childPackage);
    }

    if (index === 0 || childLocators.length === 0) {
      // report from the top of the chain or in a failure case
      this.trace(
        `${this.prettyName}: getCandidates: (${resolverType}) found ${childLocators.length} locators from ${foundChildLocators ? "child" : "package"}`
      );
    }

    // now remap the locators back to our locator protocol
    return this.transformLocators(
      childLocators,
      this.resolverLocatorIndex(resolverType)
    );
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Locator[],
    opts: ResolveOptions,
    resolverType: ResolverType
  ) {
    const index = this.indexFromResolverType(resolverType);
    const childIndex = index + 1;

    // set up the parameters for calling the next resolver in the chain
    const [childDependencies] = this.getNextDependencies(dependencies, index);
    const childDescriptor = this.transformDescriptor(descriptor, childIndex);
    const childLocators = this.transformLocators(locators, childIndex);
    const resolver = opts.resolver;

    // now chain the getSatisfying call through to the next resolver
    const results = await resolver.getSatisfying(
      childDescriptor,
      childDependencies,
      childLocators,
      opts
    );

    // if the native locator type is not ours, remap the results to our type
    const locatorIndex = this.resolverLocatorIndex(resolverType);
    if (locatorIndex !== childIndex) {
      results.locators = this.transformLocators(results.locators, locatorIndex);
    }

    if (index === 0 || results.locators.length === 0) {
      // report from the top of the chain
      this.trace(
        `${this.prettyName}: getSatisfying (${resolverType}) found ${results.locators.length} locators from ${locators.length} inputs`
      );
    }

    return results;
  }

  toFallbackLocator(locator: Locator) {
    return this.transformLocator(locator, this.fallbackIndex);
  }

  toLeadDescriptor(descriptor: Descriptor) {
    return this.transformDescriptor(descriptor, 0);
  }

  private indexFromResolverType(resolverType: ResolverType) {
    return resolverType === "local" ? this.localIndex : this.remoteIndex;
  }

  private resolverLocatorIndex(resolverType: ResolverType) {
    return resolverType === "local" ? this.localIndex : this.fallbackIndex;
  }

  private transformDescriptor(descriptor: Descriptor, index: number) {
    return coerceDescriptorTo(descriptor, this.protocols[index]);
  }

  private transformLocator(locator: Locator, index: number) {
    return coerceLocatorTo(locator, this.protocols[index]);
  }

  private transformLocators(locators: Locator[], index: number) {
    return locators.map((locator) => this.transformLocator(locator, index));
  }

  private getNextDependencies(
    dependencies: Dependencies,
    thisIndex: number
  ): [Dependencies, Package | null] {
    const childIndex = thisIndex + 1;
    // if dependent resolution returned a package keep track of that as a fallback
    const nextPackage = dependencies[this.dependentKeys[childIndex]];
    if (nextPackage && this.packages[childIndex] === null) {
      this.packages[childIndex] = nextPackage;
    }
    const childPackage = this.packages[childIndex];
    const childDependencies: Dependencies = {};
    if (childPackage) {
      childDependencies[this.dependentKeys[childIndex]] = childPackage;
    }
    return [childDependencies, childPackage];
  }
}
