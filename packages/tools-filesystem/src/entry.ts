import fs from "node:fs";
import { WITH_UTF8_ENCODING } from "./const";

const BIGINT_STATS_SYNC_OPTIONS = {
  bigint: true,
  throwIfNoEntry: true,
} as const;

const BIGINT_STATS_OPTIONS = { bigint: true } as const;

export class FSEntry {
  path: string;

  // cached internal properties, loaded on demand and cached for future access
  protected _stats?: fs.BigIntStats;
  protected _statsPromise?: Promise<fs.BigIntStats | undefined>;
  protected _exists?: boolean;
  protected _content?: string;
  protected _contentPromise?: Promise<string>;

  constructor(path: string) {
    this.path = path;
  }

  /** an FSEntry can be treated as a string path */
  [Symbol.toPrimitive](_hint: string) {
    return this.path;
  }

  /** check file existence, returns true/false with no exceptions thrown */
  get exists(): boolean {
    return (this._exists ??= this.getStatsSync() !== undefined);
  }

  /** get the stats of the file, throws if the file does not exist */
  get stats(): fs.BigIntStats {
    return this._stats ?? this.requireStats(this.getStatsSync());
  }

  /** get the content of the file, throws if the file does not exist */
  get content(): string {
    return (this._content ??= fs.readFileSync(this.path, WITH_UTF8_ENCODING));
  }

  /** check if the content of the file is loaded without loading if it is not */
  get contentLoaded(): boolean {
    return this._content !== undefined;
  }

  /** check if the entry is a directory */
  get isDirectory(): boolean {
    return this.stats.isDirectory();
  }

  /** check if the entry is a file */
  get isFile(): boolean {
    return this.stats.isFile();
  }

  /** get the size of the file */
  get size(): number {
    return Number(this.stats.size);
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

  private requireStats(stats: fs.BigIntStats | undefined): fs.BigIntStats {
    if (stats === undefined) {
      throw new Error(`ENOENT: No existing filesystem entry at: ${this.path}`);
    }
    return stats;
  }
}
