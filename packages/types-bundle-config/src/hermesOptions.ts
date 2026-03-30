export type HermesOptions = {
  /**
   * Path to `hermesc` binary. By default, `cli` will try to find it in
   * `node_modules`.
   */
  command?: string;

  /**
   * List of arguments passed to `hermesc`. By default, this is
   * `["-O", "-output-source-map", "-w"]`.
   */
  flags?: string[];
};
