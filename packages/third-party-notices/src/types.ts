export type ModuleNamePathPair = {
  name: string;
  path: string;
};

export type License = ModuleNamePathPair & {
  version: string;
  licenseURLs: string[];
  license?: string;
  licenseFile?: string;
  licenseText?: string;
  noticeFile?: string;
  noticeText?: string;
};

export type SourceMap = {
  sources: string[];
  sections?: SourceSection[];
};

export type SourceSection = {
  map: SourceMap;
};

export type WriteThirdPartyNoticesOptions = {
  rootPath: string;
  sourceMapFile: string;
  json: boolean;
  outputFile?: string;
  ignoreScopes?: string[];
  ignoreModules?: string[];
  preambleText?: string[];
  additionalText?: string[];
};
