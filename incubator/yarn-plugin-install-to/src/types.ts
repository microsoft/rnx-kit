import type {
  Cache,
  DescriptorHash,
  LocatorHash,
  Project,
  StreamReport,
} from "@yarnpkg/core";

export type InstallOptions = {
  cache: Cache;
  report: StreamReport;
  lockfileOnly?: boolean;
  immutable?: boolean;
};

export type ProjectScopingOptions = {
  project: Project;
  accessibleLocators: Set<LocatorHash>;
  storedResolutions: Map<DescriptorHash, LocatorHash>;
};
