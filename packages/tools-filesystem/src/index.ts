export { filesMatch, filesMatchSync, isSameFileFromStats } from "./compare.ts";
export {
  BIGINT_STATS_OPTIONS,
  BIGINT_STATS_SYNC_OPTIONS,
  DEFAULT_DIR_MODE,
  DEFAULT_ENCODING,
  DEFAULT_FILE_MODE,
  MKDIR_P_OPTIONS,
  WITH_UTF8_ENCODING,
} from "./const.ts";
export {
  ensureDir,
  ensureDirForFile,
  ensureDirForFileSync,
  ensureDirSync,
} from "./dirs.ts";
export { FSEntry, toFSEntry, type WriteOptions } from "./entry.ts";
export {
  readJson,
  readJsonSync,
  readTextFile,
  readTextFileSync,
  writeJSONFileSync,
  writeTextFileSync,
} from "./fileio.ts";
export { parseJSON, serializeJSON, stripBOM } from "./json.ts";
