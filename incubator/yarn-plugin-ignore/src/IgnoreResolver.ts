import type {
  Descriptor,
  Locator,
  Package,
  Resolver,
  ResolveOptions,
} from "@yarnpkg/core";
import { LinkType, structUtils } from "@yarnpkg/core";
import { IGNORE_PROTOCOL } from "./constants.ts";

export class IgnoreResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor): boolean {
    return descriptor.range.startsWith(IGNORE_PROTOCOL);
  }

  supportsLocator(locator: Locator): boolean {
    return locator.reference.startsWith(IGNORE_PROTOCOL);
  }

  shouldPersistResolution(): boolean {
    return false;
  }

  bindDescriptor(descriptor: Descriptor, fromLocator: Locator): Descriptor {
    return structUtils.bindDescriptor(descriptor, {
      locator: structUtils.stringifyLocator(fromLocator),
    });
  }

  getResolutionDependencies(): Record<string, Descriptor> {
    return {};
  }

  async getCandidates(
    descriptor: Descriptor,
    _dependencies: Record<string, Package>,
    _opts: ResolveOptions
  ): Promise<Locator[]> {
    return [structUtils.makeLocator(descriptor, IGNORE_PROTOCOL)];
  }

  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Locator[],
    opts: ResolveOptions
  ): Promise<{ locators: Locator[]; sorted: boolean }> {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts);
    return {
      locators: locators.filter(
        (candidate) => candidate.locatorHash === locator.locatorHash
      ),
      sorted: false,
    };
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    return {
      ...locator,

      version: "0.0.0",

      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.SOFT,

      conditions: null,

      dependencies: new Map(),
      peerDependencies: new Map(),

      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),

      bin: new Map(),
    };
  }
}
