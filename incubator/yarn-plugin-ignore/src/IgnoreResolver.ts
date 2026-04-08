import type {
  Descriptor,
  Locator,
  Package,
  Resolver,
  ResolveOptions,
} from "@yarnpkg/core";
import { LinkType, Manifest, structUtils } from "@yarnpkg/core";
import { equal } from "node:assert";
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

  bindDescriptor(descriptor: Descriptor, _fromLocator: Locator): Descriptor {
    return descriptor;
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
    _descriptor: Descriptor,
    _dependencies: Record<string, Package>,
    locators: Locator[],
    _opts: ResolveOptions
  ): Promise<{ locators: Locator[]; sorted: boolean }> {
    equal(locators.length, 1, "Expected a single locator candidate");
    return { locators, sorted: true };
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const manifest = new Manifest();
    return {
      ...locator,

      version: "0.0.0",

      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.SOFT,

      conditions: null,

      dependencies: manifest.dependencies,
      peerDependencies: manifest.peerDependencies,

      dependenciesMeta: manifest.dependenciesMeta,
      peerDependenciesMeta: manifest.peerDependenciesMeta,

      bin: manifest.bin,
    };
  }
}
