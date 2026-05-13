import { error, info, warn } from "@rnx-kit/console";

type GroupMarkers = {
  beginGroup(title: string): void;
  endGroup(title: string): void;
};

export type Reporter = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  close(): void;
};

const getGroupMarkers = (() => {
  // Accessing `process.env` is expensive. Cache the result and use it for the
  // remaining time of the process.
  let groupMarkers: GroupMarkers | undefined = undefined;
  return (log = console.log): GroupMarkers => {
    if (!groupMarkers) {
      if (process.env["GITHUB_ACTIONS"] === "true") {
        groupMarkers = {
          beginGroup: (title) => log(`::group::${encodeURI(title)}`),
          endGroup: () => log("::endgroup::"),
        };
      } else if (process.env["TF_BUILD"] === "True") {
        groupMarkers = {
          beginGroup: (title) => log(`##[group]${title}`),
          endGroup: () => log("##[endgroup]"),
        };
      } else {
        const noop = () => undefined;
        groupMarkers = {
          beginGroup: noop,
          endGroup: noop,
        };
      }
    }
    return groupMarkers;
  };
})();

export function makeDefaultReporter(_title: string): Reporter {
  return { info, warn, error, close: () => undefined };
}

export function makeGroupedReporter(title: string): Reporter {
  const { beginGroup, endGroup } = getGroupMarkers();
  let groupBegun = false;
  return {
    info: (message) => {
      groupBegun = groupBegun || (beginGroup(title), true);
      info(message);
    },
    warn: (message) => {
      groupBegun = groupBegun || (beginGroup(title), true);
      warn(message);
    },
    error: (message) => {
      groupBegun = groupBegun || (beginGroup(title), true);
      error(message);
    },
    close: () => {
      if (groupBegun) {
        endGroup(title);
      }
    },
  };
}

export function withGroupReporter<T>(
  title: string,
  fn: (reporter: Reporter) => T
): T {
  const reporter = makeGroupedReporter(title);
  const result = fn(reporter);
  reporter.close();
  return result;
}
