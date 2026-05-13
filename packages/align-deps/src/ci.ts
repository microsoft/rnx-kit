type GroupMarkers = {
  beginGroup: (title: string) => void;
  endGroup: () => void;
};

type Output = Pick<typeof console, "error" | "log" | "warn">;

function noop() {
  return undefined;
}

export function getGroupMarkers(
  log: typeof console.log = console.log,
  env = process.env
): GroupMarkers {
  if (env["GITHUB_ACTIONS"] === "true") {
    return {
      beginGroup: (title) => log(`::group::${encodeURI(title)}`),
      endGroup: () => log("::endgroup::"),
    };
  }

  if (env["TF_BUILD"] === "True") {
    return {
      beginGroup: (title) => log(`##[group]${title}`),
      endGroup: () => log("##[endgroup]"),
    };
  }

  return {
    beginGroup: noop,
    endGroup: noop,
  };
}

export function withLogGroup<T>(
  title: string,
  fn: () => T,
  output: Output = console,
  env = process.env
): T {
  const originalLog = output.log;
  const originalWarn = output.warn;
  const originalError = output.error;
  const { beginGroup, endGroup } = getGroupMarkers(originalLog, env);
  let groupStarted = false;

  const begin = () => {
    if (!groupStarted) {
      beginGroup(title);
      groupStarted = true;
    }
  };

  output.log = (...args) => {
    begin();
    originalLog(...args);
  };
  output.warn = (...args) => {
    begin();
    originalWarn(...args);
  };
  output.error = (...args) => {
    begin();
    originalError(...args);
  };

  try {
    return fn();
  } finally {
    output.log = originalLog;
    output.warn = originalWarn;
    output.error = originalError;

    if (groupStarted) {
      endGroup();
    }
  }
}
