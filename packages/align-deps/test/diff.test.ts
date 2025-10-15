import { isSubset } from "../src/diff";

describe("isSubset()", () => {
  it("returns true if the current version is a subset of the target version", () => {
    expect(isSubset("1.0.0", "1.0.0")).toBe(true);
    expect(isSubset("^1.0.0", "^1.0.0")).toBe(true);
    expect(isSubset("~1.0.0", "~1.0.0")).toBe(true);
    expect(isSubset("1.0.0 - 2.0.0", "1.0.0 - 2.0.0")).toBe(true);
    expect(isSubset(">=1.0.0", ">=1.0.0")).toBe(true);
    expect(isSubset("<=2.0.0", "<=2.0.0")).toBe(true);
    expect(isSubset(">1.0.0", ">1.0.0")).toBe(true);
    expect(isSubset("<2.0.0", "<2.0.0")).toBe(true);
    expect(isSubset("1.x", "1.x")).toBe(true);
    expect(isSubset("1.*", "1.*")).toBe(true);
    expect(isSubset("*", "*")).toBe(true);
    expect(isSubset("latest", "latest")).toBe(true);

    expect(isSubset("1.0.0", "^1.0.0")).toBe(true);
    expect(isSubset("1.5.0", "^1.0.0")).toBe(true);
    expect(isSubset("1.0.0", "~1.0.0")).toBe(true);
    expect(isSubset("1.0.5", "~1.0.0")).toBe(true);
    expect(isSubset("1.5.0", "1.0.0 - 2.0.0")).toBe(true);
    expect(isSubset("2.0.0", "1.0.0 - 2.0.0")).toBe(true);
    expect(isSubset(">=1.5.0", ">=1.0.0")).toBe(true);
    expect(isSubset("<=1.5.0", "<=2.0.0")).toBe(true);
    expect(isSubset(">1.5.0", ">1.0.0")).toBe(true);
    expect(isSubset("<1.5.0", "<2.0.0")).toBe(true);
    expect(isSubset("1.x", "1.0.0 - 2.0.0")).toBe(true);
    expect(isSubset("1.*", "1.0.0 - 2.0.0")).toBe(true);
    expect(isSubset("1.x", ">=1.0.0")).toBe(true);
    expect(isSubset("1.*", ">=1.0.0")).toBe(true);
    expect(isSubset("1.x", "<=2.0.0")).toBe(true);
    expect(isSubset("1.*", "<=2.0.0")).toBe(true);

    expect(isSubset("*", ">=1.0.0")).toBe(false);
    expect(isSubset("*", "<=2.0.0")).toBe(false);
    expect(isSubset("*", ">=1.0.0 <=2.0.0")).toBe(false);
  });

  it("handles unknown protocols gracefully", () => {
    expect(isSubset("file:../project-a", "file:../project-a")).toBe(true);
    expect(isSubset("file:../project-a", "file:../project-a2")).toBe(false);

    expect(
      isSubset(
        "git+ssh://github.com/user/repo.git",
        "git+ssh://github.com/user/repo.git"
      )
    ).toBe(true);
    expect(
      isSubset(
        "git+ssh://github.com/user/repo.git",
        "git+ssh://github.com/user/other-repo.git"
      )
    ).toBe(false);

    expect(isSubset("github:user/repo", "github:user/repo")).toBe(true);
    expect(isSubset("github:user/repo", "github:user/other-repo")).toBe(false);

    expect(isSubset("catalog:", "catalog:")).toBe(true);
    expect(isSubset("catalog:", "catalog:name")).toBe(false);
  });
});
