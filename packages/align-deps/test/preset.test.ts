import { filterPreset } from "../src/preset";
import preset from "../src/presets/microsoft/react-native";
import profile_0_68 from "../src/presets/microsoft/react-native/profile-0.68";
import profile_0_69 from "../src/presets/microsoft/react-native/profile-0.69";
import profile_0_70 from "../src/presets/microsoft/react-native/profile-0.70";

describe("filterPreset()", () => {
  test("returns no profiles if requirements cannot be satisfied", () => {
    const profiles = filterPreset(preset, [
      "react@17.0",
      "react-native@>=69.0",
    ]);
    expect(profiles).toEqual({});
  });

  test("returns profiles satisfying single version range", () => {
    const profiles = filterPreset(preset, ["react-native@0.70"]);
    expect(profiles).toEqual({ "0.70": profile_0_70 });
  });

  test("returns profiles satisfying multiple version ranges", () => {
    const profiles = filterPreset(preset, ["react-native@0.68 || 0.70"]);
    expect(profiles).toEqual({ "0.68": profile_0_68, "0.70": profile_0_70 });
  });

  test("returns profiles satisfying wide version range", () => {
    const profiles = filterPreset(preset, ["react-native@>=0.68"]);
    expect(profiles).toEqual({
      "0.68": profile_0_68,
      "0.69": profile_0_69,
      "0.70": profile_0_70,
    });
  });

  test("returns profiles satisfying non-react-native requirements", () => {
    const profiles = filterPreset(preset, ["react@18"]);
    expect(profiles).toEqual({
      "0.69": profile_0_69,
      "0.70": profile_0_70,
    });
  });

  test("returns profiles satisfying multiple requirements", () => {
    const profiles = filterPreset(preset, [
      "react@^18.0",
      "react-native@>=0.64",
    ]);
    expect(profiles).toEqual({
      "0.69": profile_0_69,
      "0.70": profile_0_70,
    });
  });
});
