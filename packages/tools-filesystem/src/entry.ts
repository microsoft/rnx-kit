import fs from "node:fs";
import { MKDIR_P_OPTIONS, WITH_UTF8_ENCODING } from "./const.ts";
import { ensureDirForFileSync } from "./dirs.ts";
import { parseJson, serializeJson } from "./json.ts";

const BIGINT_STATS_SYNC_OPTIONS = {
  bigint: true,
  throwIfNoEntry: true,
} as const;
const BIGINT_STATS_OPTIONS = { bigint: true } as const;

export type WriteOptions = {
  /** whether to force writing the file even if the content is not marked as dirty (defaults to false) */
  force?: boolean;

  /** whether to end with a newline (defaults to false) */
  newline?: boolean;
};

/**
 * FSEntry is a cached wrapper around a path on the filesystem, it allows for on-demand loading of stats and content,
 * as well as tracking whether the content has been modified and needs to be written out. It also provides convenience methods
 * for checking if the entry is a file or directory, and for writing out the content either synchronously or asynchronously.
 *
 * It also coalesces async methods so that multiple async calls will only result in one actual filesystem call, sharing the result
 * among all callers. The async methods share the same result cache with the sync methods, so if information has already been
 * obtained via either method, subsequent filesystem access will be avoided.
 */
export class FSEntry {
  readonly path: string;

  // cached internal properties, loaded on demand and cached for future access
  protected _stats?: fs.BigIntStats;
  protected _statsPromise?: Promise<fs.BigIntStats | undefined>;
  protected _exists?: boolean;
  protected _content?: string;
  protected _contentPromise?: Promise<string>;
  protected _needsWrite?: boolean;
  protected _needsDirEnsure?: boolean;

  constructor(path: string) {
    this.path = path;
  }

  /**
   * an FSEntry can be treated as a string path
   * @returns the path of the entry as a string
   */
  [Symbol.toPrimitive](_hint: string) {
    return this.path;
  }

  /**
   * check file existence, returns true/false with no exceptions thrown
   * @returns true if the file exists, false otherwise
   */
  get exists(): boolean {
    return (this._exists ??= this.getStatsSync() !== undefined);
  }

  /**
   * get the stats of the file, throws if the file does not exist
   * @returns the stats of the file as a BigIntStats object
   */
  get stats(): fs.BigIntStats {
    return this._stats ?? this.requireStats(this.getStatsSync());
  }

  /**
   * get the content of the file, throws if the file does not exist
   * @returns the content of the file as a string
   */
  get content(): string {
    return (this._content ??= fs.readFileSync(this.path, WITH_UTF8_ENCODING));
  }

  /**
   * set the content of the file, setting up the values for writing
   * @param value - the new content of the file
   */
  set content(value: string) {
    // the first time we set the content, check if we know for sure whether a file exists at the path or not
    this._needsDirEnsure ??=
      this._content === undefined && this.stats == undefined;
    // mark whether the content is dirty
    this._needsWrite =
      this._needsWrite ||
      this._content === undefined ||
      this._content !== value;
    // set the new content value
    this._content = value;
  }

  /**
   * check if the content of the file is loaded without loading if it is not
   * @returns true if the content is loaded, false otherwise
   */
  get contentLoaded(): boolean {
    return this._content !== undefined;
  }

  /**
   * check if the entry is a directory
   * @returns true if the entry is a directory, false otherwise
   */
  get isDirectory(): boolean {
    return this.stats.isDirectory();
  }

  /**
   * check if the entry is a file
   * @returns true if the entry is a file, false otherwise
   */
  get isFile(): boolean {
    return this.stats.isFile();
  }

  /**
   * get the size of the file
   * @returns the size of the file in bytes as a number
   */
  get size(): number {
    return Number(this.stats.size);
  }

  /**
   * Ensure contents are loaded and parse as JSON
   * @returns parsed JSON content, optionally cast to type T
   */
  readJsonSync<T = ReturnType<typeof JSON.parse>>(): T {
    return parseJson<T>(this.content);
  }

  /**
   * Asynchronously ensure contents are loaded and parse as JSON
   * @returns parsed JSON content, optionally cast to type T
   */
  async readJson<T = ReturnType<typeof JSON.parse>>(): Promise<T> {
    return this.getContent().then((content) => parseJson<T>(content));
  }

  /**
   * Synchronously write out data as JSON, replacing the content of the file with the serialized
   * JSON string, writing to disk synchronously, and marking the content as not dirty after writing.
   * @param data the data to serialize to JSON and write to the file
   */
  writeJsonSync(data: unknown): void {
    this.content = serializeJson(data);
    this.writeContentsSync();
  }

  /**
   * Asynchronously write out data as JSON, replacing the content of the file with the serialized
   * JSON string, writing to disk asynchronously, and marking the content as not dirty after writing.
   * @param data the data to serialize to JSON and write to the file
   * @returns a promise that resolves when the write operation is complete
   */
  async writeJson(data: unknown): Promise<void> {
    this.content = serializeJson(data);
    return this.writeContents();
  }

  /**
   * synchronously write out the file
   * @param options - options for writing the file
   */
  writeContentsSync(options?: WriteOptions): void {
    const content = this.getContentToWrite(options);
    if (content !== undefined) {
      if (this._needsDirEnsure) {
        ensureDirForFileSync(this.path);
        this._needsDirEnsure = false;
      }
      fs.writeFileSync(this.path, content, WITH_UTF8_ENCODING);
      this._needsWrite = false;
    }
  }

  /**
   * asynchronously write the content of the file
   * @param options - options for writing the file
   */
  async writeContents(options?: WriteOptions): Promise<void> {
    const content = this.getContentToWrite(options);
    if (content !== undefined) {
      if (this._needsDirEnsure) {
        await fs.promises.mkdir(this.path, MKDIR_P_OPTIONS);
        this._needsDirEnsure = false;
      }
      return fs.promises
        .writeFile(this.path, content, WITH_UTF8_ENCODING)
        .then(() => {
          this._needsWrite = false;
        });
    }
  }

  private getContentToWrite(options?: WriteOptions): string | undefined {
    const { force, newline } = options ?? {};
    if (this._content === undefined || (!force && !this._needsWrite)) {
      return undefined;
    }
    return newline && !this._content.endsWith("\n")
      ? this._content + "\n"
      : this._content;
  }

  /** asynchronously check if the file exists, does not throw */
  async getExists(): Promise<boolean> {
    return (this._exists ??= (await this.getStatsAsync()) !== undefined);
  }

  /** asynchronously get the stats of the file, throws if the file does not exist */
  async getStats(): Promise<fs.BigIntStats> {
    return this._stats ?? this.requireStats(await this.getStatsAsync());
  }

  /** asynchronously get the content of the file, throws if the file does not exist */
  async getContent(): Promise<string> {
    return (
      this._content ??
      (this._contentPromise ??= fs.promises
        .readFile(this.path, WITH_UTF8_ENCODING)
        .then((content: string) => {
          this._content = content;
          return content;
        })
        .finally(() => {
          this._contentPromise = undefined;
        }))
    );
  }

  private getStatsSync(): fs.BigIntStats | undefined {
    return (this._stats ??= fs.statSync(this.path, BIGINT_STATS_SYNC_OPTIONS));
  }

  private getStatsAsync():
    | fs.BigIntStats
    | Promise<fs.BigIntStats | undefined> {
    return (
      this._stats ??
      (this._statsPromise ??= fs.promises
        .stat(this.path, BIGINT_STATS_OPTIONS)
        .then((stats: fs.BigIntStats) => {
          this._stats = stats;
          return stats;
        })
        .catch(() => {
          return undefined;
        })).finally(() => {
        this._statsPromise = undefined;
      })
    );
  }

  /**
   * Throw an error if stats are undefined. Because this was potentially obtained via the non-throwing
   * stats method for an existence check, synthesize the ENOENT error in this case.
   */
  private requireStats(stats: fs.BigIntStats | undefined): fs.BigIntStats {
    if (stats === undefined) {
      const err = new Error(
        `ENOENT: no such file or directory, stat '${this.path}'`
      ) as NodeJS.ErrnoException;

      err.code = "ENOENT";
      err.errno = -2;
      err.syscall = "stat";
      err.path = this.path;

      throw err;
    }
    return stats;
  }
}
