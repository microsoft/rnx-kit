import { jestOptions, resolveJestCli } from "../src/test";

describe("rnx-test", () => {
  test("retrieves options from 'jest-cli'", () => {
    const options = jestOptions();
    expect(options.length).toBeGreaterThan(1);

    const updateSnapshot = options.find(({ name }) => name.startsWith("-u,"));
    expect(updateSnapshot).toBeDefined();
  });

  test("resolves 'jest-cli' starting from 'jest'", () => {
    expect(resolveJestCli()).toMatch(
      /node_modules[/\\]jest-cli[/\\]build[/\\]index.js$/
    );
  });
});
