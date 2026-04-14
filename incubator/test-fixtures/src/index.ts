import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Sets of fixtures which can be requested by name.
 *
 * Current values:
 * - "language" - fixtures for testing js/ts language features, particularly for parsing
 * - "realworld" - fixtures for testing real-world code, particularly for parsing and transformation
 */
export type FixtureSetName = "language" | "realworld";

/**
 * A wrapper around a requested set of fixtures.
 */
export type FixtureSet = {
  /**
   * The directory containing the fixture files. path.join(dir, file) will give the full path to a fixture file.
   */
  readonly dir: string;

  /**
   * The list of fixture filenames in the set. Will not contain the full path.
   */
  readonly files: string[];

  /**
   * Get the source code of a fixture file. Loaded on-demand, then cached.
   * @param file The filename of the fixture.
   * @returns The source code of the fixture.
   */
  getSrc(file: string): string;

  /**
   * Get the source code of a fixture file asynchronously. Loaded on-demand, then cached.
   * @param file The filename of the fixture.
   * @returns A promise that resolves to the source code of the fixture.
   */
  getSrcAsync(file: string): Promise<string>;
};

/**
 * Get a FixtureSet by name. Requesting the set of fixtures will perform a readdir on the directory
 * to get the files, source will only be loaded on demand. Multiple requests for the same set will
 * return the same FixtureSet instance, so the directory will only be read once per set, and each
 * fixture file will only be read once per set.
 *
 * @param set The name of the fixture set to retrieve.
 * @returns The requested FixtureSet.
 */
export const getFixtures = (() => {
  const sets: Partial<Record<FixtureSetName, FixtureSet>> = {};
  const base =
    typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  const fixturesDir = path.join(base, "../test/__fixtures__");
  const subdirs: Record<FixtureSetName, string> = {
    language: "lang",
    realworld: "realworld",
  };

  return (set: FixtureSetName): FixtureSet => {
    return (sets[set] ??= new FixtureWrapper(
      path.join(fixturesDir, subdirs[set])
    ));
  };
})();

class FixtureWrapper implements FixtureSet {
  readonly dir: string;
  readonly files: string[];
  private srcCache: Record<string, string>;

  constructor(dir: string) {
    this.dir = dir;
    this.files = fs.readdirSync(dir);
    this.srcCache = {};
  }

  getSrc(file: string): string {
    return (this.srcCache[file] ??= fs.readFileSync(
      path.join(this.dir, file),
      "utf8"
    ));
  }

  async getSrcAsync(file: string): Promise<string> {
    if (this.srcCache[file]) {
      return this.srcCache[file]!;
    }
    const src = await fs.promises.readFile(path.join(this.dir, file), "utf8");
    return (this.srcCache[file] ??= src);
  }
}
