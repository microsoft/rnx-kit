import { LinkType } from "@yarnpkg/core";
import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { IGNORE_PROTOCOL } from "../src/constants.ts";
import { IgnoreResolver } from "../src/IgnoreResolver.ts";
import { makePackageInfo, makeResolveOptions } from "./helper.ts";

describe("IgnoreResolver", () => {
  const resolver = new IgnoreResolver();

  it("supports `ignore:` protocol", () => {
    const { descriptor, locator } = makePackageInfo();

    ok(resolver.supportsDescriptor(descriptor));
    ok(resolver.supportsLocator(locator));
  });

  it("does not persist resolution", () => {
    ok(!resolver.shouldPersistResolution());
  });

  it("binds descriptor", () => {
    const { descriptor, locator } = makePackageInfo();
    const { name, range, scope } = resolver.bindDescriptor(descriptor, locator);

    equal(scope, locator.scope);
    equal(name, locator.name);
    equal(range, IGNORE_PROTOCOL);
  });

  it("returns no dependencies", () => {
    deepEqual(resolver.getResolutionDependencies(), {});
  });

  it("returns one candidate", async () => {
    const { descriptor, locator } = makePackageInfo();
    const opts = makeResolveOptions();
    const candidates = await resolver.getCandidates(descriptor, {}, opts);

    equal(candidates.length, 1);

    const { name, reference, scope } = candidates[0];

    equal(scope, locator.scope);
    equal(name, locator.name);
    equal(reference, IGNORE_PROTOCOL);
  });

  it("returns the one candidate as satisfying", async () => {
    const { descriptor, locator } = makePackageInfo();
    const opts = makeResolveOptions();
    const res = await resolver.getSatisfying(descriptor, {}, [locator], opts);

    equal(res.locators.length, 1);

    const { name, reference, scope } = res.locators[0];

    equal(scope, locator.scope);
    equal(name, locator.name);
    equal(reference, IGNORE_PROTOCOL);
  });

  it("resolves the stub", async () => {
    const { locator } = makePackageInfo();
    const opts = makeResolveOptions();

    const {
      bin,
      dependencies,
      dependenciesMeta,
      peerDependencies,
      peerDependenciesMeta,
      ...pkg
    } = await resolver.resolve(locator, opts);

    deepEqual(pkg, {
      ...locator,

      version: "0.0.0",
      languageName: "node",
      linkType: LinkType.SOFT,

      conditions: null,
    });

    equal(dependencies.size, 0);
    equal(peerDependencies.size, 0);

    equal(dependenciesMeta.size, 0);
    equal(peerDependenciesMeta.size, 0);

    equal(bin.size, 0);
  });
});
