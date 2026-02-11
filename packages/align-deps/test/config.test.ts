import type { Capability } from "@rnx-kit/config-types";
import type { PackageManifest } from "@rnx-kit/node-types";
import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containsValidPresets,
  findEmptyRequirements,
  isPackageManifest,
  sanitizeCapabilities,
} from "../src/config.ts";

describe("containsValidPresets()", () => {
  it("is valid when 'presets' is unset", () => {
    ok(containsValidPresets({}));
  });

  it("is invalid when 'presets' is empty", () => {
    ok(!containsValidPresets({ presets: [] }));
  });

  it("is invalid when 'presets' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    ok(!containsValidPresets({ presets: "[]" }));
  });
});

describe("findEmptyRequirements()", () => {
  it("is invalid when 'requirements' is unset", () => {
    equal(findEmptyRequirements({}), "requirements");
  });

  it("is invalid when 'requirements' is empty", () => {
    equal(findEmptyRequirements({ requirements: [] }), "requirements");

    equal(
      // @ts-expect-error intentionally passing an invalid type
      findEmptyRequirements({ requirements: { production: [] } }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        requirements: { development: [], production: [] },
      }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"] },
      }),
      "requirements.production"
    );

    equal(
      findEmptyRequirements({
        requirements: { development: ["react-native@*"], production: [] },
      }),
      "requirements.production"
    );
  });

  it("is invalid when 'requirements' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    equal(findEmptyRequirements({ requirements: "[]" }), "requirements");

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: "[]", production: "[]" },
      }),
      "requirements.development"
    );

    equal(
      findEmptyRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { development: ["react-native@*"], production: "[]" },
      }),
      "requirements.production"
    );
  });

  it("is valid when 'requirements' contains at least one requirement", () => {
    equal(
      findEmptyRequirements({ requirements: ["react-native@*"] }),
      undefined
    );

    equal(
      findEmptyRequirements({
        requirements: {
          development: ["react-native@*"],
          production: ["react-native@*"],
        },
      }),
      undefined
    );
  });
});

describe("isPackageManifest()", () => {
  it("returns true when the object is a PackageManifest", () => {
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    ok(isPackageManifest(manifest));
  });

  it("returns false when the object is not a PackageManifest", () => {
    ok(!isPackageManifest(undefined));
    ok(!isPackageManifest({}));
    ok(!isPackageManifest("hello"));
    ok(!isPackageManifest({ name: "name but no version" }));
    ok(!isPackageManifest({ version: "version but no name" }));
  });
});

describe("sanitizeCapabilities()", () => {
  it("removes illegal names", () => {
    const capabilities = [
      "__proto__",
      "constructor",
      "prototype",
      "core",
    ] as Capability[];

    deepEqual(sanitizeCapabilities(capabilities), ["core"]);
  });

  it("handles empty array", () => {
    deepEqual(sanitizeCapabilities(undefined), []);
    deepEqual(sanitizeCapabilities([]), []);
  });
});
