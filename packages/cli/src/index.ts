export const rnxBundle = (
  argv: Array<string>,
  config /*: ConfigT*/,
  options: Object
) => {
  console.log("It worked!");
  console.log("__dirname: %s", __dirname);
  console.log("working directory: %s", process.cwd());
  console.log("argv: %o", argv);
  // console.log("config: %o", config);
  console.log("options: %o", options);
};
