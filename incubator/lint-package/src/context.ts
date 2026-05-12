import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import {
  createJSONValidator,
  type JSONObject,
  type JSONValidator,
} from "@rnx-kit/lint-json";
import type { KitConfig } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import type { Yarn } from "@yarnpkg/types";
import nodefs from "node:fs";
import path from "node:path";
import { styleText } from "node:util";
import type { PackageValidationOptions } from "./types.ts";
import { createYarnWorkspaceValidator } from "./yarn.ts";

/**
 * A validation context for a package, providing access to the package root, manifest,
 * and utilities for enforcing JSON structure, checking for file existence, and optionally
 * fixing issues in the package manifest or other JSON files.
 *
 * Issues can be reported via the `error` method, which collects errors encountered
 * during validation and reports them when `finish` is called.
 */
export class PackageValidationContext<
  TManifest extends PackageManifest = PackageManifest,
> implements JSONValidator {
  /**
   * Create a package validation context for a given package root
   * @param root the root directory of the package
   * @param options optional options for additional configuration
   * @returns a new PackageValidationContext instance
   */
  static create<TManifest extends PackageManifest = PackageManifest>(
    root: string,
    options: PackageValidationOptions<TManifest> = {}
  ) {
    root = path.resolve(root);
    const { manifest, ...innerOptions } = options;
    const jsonPath = path.join(root, "package.json");
    innerOptions.header ??= `${styleText("red", "errors")} in package at ${styleText("cyan", path.relative(process.cwd(), root))}:`;
    const validator = createJSONValidator(
      jsonPath,
      manifest as JSONObject,
      innerOptions
    );
    return new PackageValidationContext<TManifest>(root, validator, options.fs);
  }

  /**
   * Create a package validation context for a Yarn workspace
   * @param workspace the Yarn workspace to validate
   * @returns a new PackageValidationContext instance
   */
  static createYarn<TManifest extends PackageManifest = PackageManifest>(
    workspace: Yarn.Constraints.Workspace
  ) {
    const validator = createYarnWorkspaceValidator(workspace);
    return new PackageValidationContext<TManifest>(workspace.cwd, validator);
  }

  /**
   * JSON Validator signature, associated with the package.json for this package.
   * These will be set up in the constructor to route to either a standard JSON
   * validator or a Yarn.Constraints.Workspace validator depending on the provided options.
   */
  get fix(): boolean {
    return this._validator.fix;
  }
  get raw(): JSONObject {
    return this._validator.raw;
  }
  get enforce(): JSONValidator["enforce"] {
    return this._validator.enforce;
  }
  get error(): JSONValidator["error"] {
    return this._validator.error;
  }
  dirty: JSONValidator["dirty"] = (pathParts: string[]) => {
    if (pathParts.length > 0 && pathParts[0] === "rnx-kit") {
      this._kitConfig = undefined;
    }
    return this._validator.dirty(pathParts);
  };

  /**
   * Public readonly properties. The manifest will be a reference to the raw JSON object
   * that is part of the JSONValidator signature.
   */
  readonly root: string;
  get manifest(): TManifest {
    return this.raw as TManifest;
  }
  get kitConfig(): KitConfig {
    return (this._kitConfig ??=
      getKitConfigFromPackageManifest(this.manifest, this.root) ?? {});
  }

  /**
   * protected and private properties and helpers
   */
  protected static JS_CONFIG_EXTENSIONS = [
    ".js",
    ".cjs",
    ".mjs",
    ".ts",
    ".cts",
    ".mts",
  ];
  protected readonly _validator: JSONValidator;
  protected readonly _fs: typeof nodefs;
  protected _delegates?: Record<string, JSONValidator | null>;
  private _fileExists?: Record<string, boolean>;
  private _attached?: Record<symbol, unknown>;
  private _kitConfig?: KitConfig;

  /**
   * Create a new PackageValidationContext for a given package root, protected to ensure that the
   * static factory methods are used to create instances
   * @param root the root directory of the package
   * @param validator the JSON validator for the package
   * @param fs filesystem module to use for filesystem queries (defaults to Node's `node:fs`)
   */
  protected constructor(
    root: string,
    validator: JSONValidator,
    fs: typeof nodefs = nodefs
  ) {
    this._validator = validator;
    this._fs = fs;
    this.root = root;
  }

  /**
   * Finish validation for this package, invoking `finish` on any delegated
   * JSON validators and the main enforce validator, then reporting any
   * collected errors to the console.
   * @returns a process exit code (1 if any errors were found, 0 otherwise)
   */
  finish(): number {
    let code = 0;
    if (this._delegates) {
      for (const delegate of Object.values(this._delegates)) {
        code |= delegate?.finish() ?? 0;
      }
    }
    // this will flush all errors collected by the main validator and print them to the console
    code |= this._validator.finish();
    return code;
  }

  /**
   * Validate an additional JSON file at the given path as part of this overall package validation
   * @param jsonPath the path to the JSON file to validate, relative to the package root
   * @returns a JSONValidator for the specified file, or null if the file does not exist
   */
  validateJSON<T extends JSONObject = JSONObject>(
    jsonPath: string
  ): JSONValidator<T> | null {
    jsonPath = path.resolve(this.root, jsonPath);
    const delegates = (this._delegates ??= {});
    if (!(jsonPath in delegates)) {
      if (this.fileExists(jsonPath)) {
        const header = `${styleText("red", "errors")} in ${path.relative(this.root, jsonPath)}:`;
        delegates[jsonPath] = createJSONValidator<T>(jsonPath, undefined, {
          fix: this.fix,
          header,
          reportError: this.error.bind(this),
          fs: this._fs,
        });
      } else {
        delegates[jsonPath] = null;
      }
    }
    return delegates[jsonPath] as JSONValidator<T> | null;
  }

  /**
   * Check whether a file exists at the given path relative to the package root
   * @param filePath the path to the file to check, relative to the package root
   * @returns true if the file exists, false otherwise
   */
  hasFile(filePath: string): boolean {
    return this.fileExists(path.resolve(this.root, filePath));
  }

  /**
   * Find a JavaScript or TypeScript configuration file with the given base name
   * by checking for the presence of any of the supported JS config extensions
   * (.js, .cjs, .mjs, .ts) relative to the package root.
   * @param baseName the base name of the configuration file to find, relative to the package root
   * @returns the resolved path to the first matching configuration file found, or undefined if none exist
   */
  findJSConfig(baseName: string): string | undefined {
    baseName = path.resolve(this.root, baseName);
    for (const ext of PackageValidationContext.JS_CONFIG_EXTENSIONS) {
      if (this.fileExists(`${baseName}${ext}`)) {
        return `${baseName}${ext}`;
      }
    }
    return undefined;
  }

  /**
   * Simple attachment mechanism for storing arbitrary data associated with this validation context. This allows the
   * context to be used as a base for arbitrary validation rules that may need to store state or data on the context.
   * @param key a unique symbol identifying the data to attach
   * @param factory a function that creates the data if it does not already exist
   * @returns the attached data
   */
  attach<T>(key: symbol, factory: (base: PackageValidationContext) => T): T {
    this._attached ??= {};
    if (!(key in this._attached)) {
      this._attached[key] = factory(this);
    }
    return this._attached[key] as T;
  }

  /**
   * Check whether a file exists at the given absolute path, caching the result
   * to avoid repeated filesystem checks.
   * @param resolvedPath the absolute path to the file to check
   * @returns true if the file exists, false otherwise
   */
  private fileExists(resolvedPath: string): boolean {
    const fileCache = (this._fileExists ??= {});
    if (!(resolvedPath in fileCache)) {
      fileCache[resolvedPath] = this._fs.existsSync(resolvedPath);
    }
    return fileCache[resolvedPath];
  }
}
