interface SingleArgs {
  commit: string;
}

function handler(argv: SingleArgs) {
  console.log(argv);
  console.log("single command");
}

export default {
  handler,
  args: {
    commit: {
      alias: "c",
      string: true,
      describe: "Commit sha to generate changelog message for",
    },
  },
};
