export type Context = {
  packages: string[];
  report: (error: string) => void;
};

export type LockfileEntry = {
  package: string;
  specifiers: string[];
  resolution: string;
};

export type Lockfile = Record<string, LockfileEntry>;

export type Rule = (
  context: Context,
  key: keyof Lockfile,
  pkg: Lockfile[string]
) => void;

export type Workspace = {
  lockfile: Lockfile;
  rules: readonly Rule[];
};
