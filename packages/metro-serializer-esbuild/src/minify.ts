type BasicSourceMap = {
  sources: Array<string>;
  sourcesContent: Array<string | null>;
};

type MinifierConfig = Readonly<Record<string, unknown>>;

type MinifierOptions = {
  code: string;
  map?: BasicSourceMap;
  filename: string;
  reserved: ReadonlyArray<string>;
  config: MinifierConfig;
};

type MinifierResult = {
  code: string;
  map?: BasicSourceMap;
};

module.exports = (options: MinifierOptions): MinifierResult => {
  return options;
};
