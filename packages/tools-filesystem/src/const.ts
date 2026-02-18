export const DEFAULT_ENCODING = "utf-8";
export const WITH_UTF8_ENCODING = { encoding: DEFAULT_ENCODING } as const;
export const DEFAULT_DIR_MODE = 0o755; // rwxr-xr-x (read/write/execute for owner, read/execute for group and others)
export const DEFAULT_FILE_MODE = 0o644; // rw-r--r-- (read/write for owner, read for group and others)
export const MKDIR_P_OPTIONS = {
  recursive: true,
  mode: DEFAULT_DIR_MODE,
} as const;
export const BIGINT_STATS_SYNC_OPTIONS = {
  bigint: true,
  throwIfNoEntry: true,
} as const;
export const BIGINT_STATS_OPTIONS = { bigint: true } as const;
