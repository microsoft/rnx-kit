import type { MinifierOptions, MinifierResult } from "metro-transform-worker";

type MinifierOptionsEx = Exclude<MinifierOptions, "map"> & {
  map: NonNullable<MinifierOptions["map"]> | undefined;
};

module.exports = (options: MinifierOptionsEx): MinifierResult => {
  return options;
};
