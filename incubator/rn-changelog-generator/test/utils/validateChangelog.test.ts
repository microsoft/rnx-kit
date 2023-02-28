import validateChangelog from "../../src/utils/validateChangelog";

const missing = `
This is a changelog that is missing the formatted changelog.
`;

const invalidWhenOnlyPlatformAndNotInternal = `
Changelog: [Android]
`;

const invalidWhenFirstCategoryIsntValid = `
Changelog: [Invalid Platform][Breaking]
`;

const invalidWhenSecondCategoryIsntValid = `
Changelog: [General][Invalid Type]
`;

const invalidWhenInternalAndInvalidSecondaryCategory = `
CHANGELOG: [iOS][Invalid]
`;

const missingWhenChangelogMissingColon = `
CHANGELOG [iOS][Breaking]
`;

const validWhenFormattingAround = `
Some message stuff about this
----
## CHANGELOG: [General][Breaking]
`;

const validdWhenMoreThan2 = `
Changelog: [iOS][Changed][Removed]
`;

const validChangelog = `
Changelog: [iOS][Changed][Removed]
`;

const validWhenOnlyInternal = `
Changelog: [Internal]
`;

const invalidSecondCategory = `
Changelog: [Internal][Android] - Blah blah
fejafkeaj jkf
`;

describe(validateChangelog, () => {
  describe("missing changelog", () => {
    it("should identify if missing changelog", () => {
      expect(validateChangelog(missing)).toBe("missing");
    });

    it("when missing colon after Changelog", () => {
      expect(validateChangelog(missingWhenChangelogMissingColon)).toBe(
        "missing"
      );
    });
  });

  describe("should identify invalid changelog", () => {
    it("when only platform and its not internal", () => {
      expect(validateChangelog(invalidWhenOnlyPlatformAndNotInternal)).toBe(
        "invalid"
      );
    });
    it("when first category isnt valid", () => {
      expect(validateChangelog(invalidWhenFirstCategoryIsntValid)).toBe(
        "invalid"
      );
    });
    it("when second category isnt valid", () => {
      expect(validateChangelog(invalidWhenSecondCategoryIsntValid)).toBe(
        "invalid"
      );
    });
    it("when internal but invalid secondary category", () => {
      expect(
        validateChangelog(invalidWhenInternalAndInvalidSecondaryCategory)
      ).toBe("invalid");
    });
  });
  describe("should identify changelog as valid", () => {
    it("when second category is invalid but ignored", () => {
      expect(validateChangelog(invalidSecondCategory)).toBe("valid");
    });

    it("when there is formatting around changelog", () => {
      expect(validateChangelog(validWhenFormattingAround)).toBe("valid");
    });

    it("when only internal", () => {
      expect(validateChangelog(validWhenOnlyInternal)).toBe("valid");
    });

    it("when valid changelog", () => {
      expect(validateChangelog(validChangelog)).toBe("valid");
    });

    it("when more than two categories provided", () => {
      expect(validateChangelog(validdWhenMoreThan2)).toBe("valid");
    });
  });
});
