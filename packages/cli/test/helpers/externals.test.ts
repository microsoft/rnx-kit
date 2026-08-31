import { requireExternal } from "../../src/helpers/externals.ts";

jest.mock("@rnx-kit/tools-react-native/context", () => ({
  resolveCommunityCLI: () => process.cwd(),
}));

const mockResolveDependencyChain = jest.fn();
jest.mock("@rnx-kit/tools-node/package", () => ({
  resolveDependencyChain: (...args: unknown[]) =>
    mockResolveDependencyChain(...args),
}));

describe("requireExternal", () => {
  const cwd = process.cwd();

  beforeEach(() => {
    mockResolveDependencyChain.mockImplementation(() => {
      throw new Error();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("points users to the rnx-kit issue tracker when a module cannot be resolved", () => {
    const issueTracker = /github\.com\/microsoft\/rnx-kit\/issues/;

    expect(() =>
      requireExternal("@react-native/dev-middleware", cwd, cwd)
    ).toThrow(issueTracker);
    expect(() =>
      requireExternal("@react-native-community/cli-server-api", cwd, cwd)
    ).toThrow(issueTracker);
  });
});
