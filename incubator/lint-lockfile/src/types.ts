export type Context = {
  packages: readonly string[];
  report: (error: string) => void;
};

export type LockfileEntry = {
  package: string;
  specifiers: readonly string[];
  resolution: string;
};

export type Lockfile = Record<string, LockfileEntry>;

export type Rule = (
  context: Context,
  key: keyof Lockfile,
  pkg: Lockfile[string]
) => void;

export type RuleBaseOptions = {
  /**
   * Whether to enable this rule.
   * @default true
   */
  enabled?: boolean;
};

export type Workspace = {
  lockfile: Lockfile;
  rules: readonly Rule[];
};
