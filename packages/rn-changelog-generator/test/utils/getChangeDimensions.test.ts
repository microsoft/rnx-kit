import getChangeDimensions from "../../src/utils/getChangeDimensions";

console.warn = () => {};
console.error = () => {};

describe(getChangeDimensions, () => {
  it("should have fixed, ios dimensions", () => {
    const dimensions = getChangeDimensions({
      sha: "abcde123456789",
      commit: {
        message:
          "Some ignored commit message\n\n[iOS] [Fixed] - Some great fixes! (#42)",
      },
      author: { login: "alloy" },
    });
    expect(dimensions.changeCategory).toBe("ios");
    expect(dimensions.changeType).toBe("fixed");
    expect(dimensions.fabric).toBe(false);
    expect(dimensions.turboModules).toBe(false);
    expect(dimensions.doesNotFollowTemplate).toBe(false);
  });

  it("should have failed, general dimensions", () => {
    const dimensions = getChangeDimensions({
      sha: "50e109c78d3ae9c10d8472d2f4888d7f59214fdd",
      commit: {
        message:
          'Fix test_js/test_js_prev_lts\n\nSummary:\nChangelog: [Internal] Remove un-necessary package installs which was using `npm install flow-bin --save-dev` which was wiping out our `node_modules` from the circleCI yarn install.\n\nIt was un-necessary as we already have `flow-bin` as a dependency in our current set-up.\n\nIn addtion, we were running `npm pack` without properly copying over our package.json dependencies (which occurs in `prepare-package-for-release`) for a consumable react-native package.\n\nThis may not have caused issue but technically we were creating an "incomplete" package to do our e2e testing on.\n\nReviewed By: charlesbdudley\n\nDifferential Revision: D33197965\n\nfbshipit-source-id: 6583ef1f8e17333c0f27ecc37635c36ae5a0bb62',
      },
      author: {
        login: "lunaleaps",
      },
    });
    expect(dimensions.doesNotFollowTemplate).toBe(false);
    expect(dimensions.fabric).toBe(false);
    expect(dimensions.turboModules).toBe(false);
    expect(dimensions.internal).toBe(true);
    expect(dimensions.changeCategory).toBe("general");
    expect(dimensions.changeType).toBe("failed");
  });
});
