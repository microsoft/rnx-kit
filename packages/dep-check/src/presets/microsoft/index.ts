import type { ProfileMap } from "../../types";
import profile_0_61 from "./profile-0.61";
import profile_0_62 from "./profile-0.62";
import profile_0_63 from "./profile-0.63";
import profile_0_64 from "./profile-0.64";
import profile_0_65 from "./profile-0.65";
import profile_0_66 from "./profile-0.66";
import profile_0_67 from "./profile-0.67";
import profile_0_68 from "./profile-0.68";
import profile_0_69 from "./profile-0.69";
import profile_0_70 from "./profile-0.70";

// Also export this by name for scripts to work around a bug where this module
// is wrapped twice, i.e. `{ default: { default: preset } }`, when imported as
// ESM.
export const preset: Readonly<ProfileMap> = {
  "0.61": profile_0_61,
  "0.62": profile_0_62,
  "0.63": profile_0_63,
  "0.64": profile_0_64,
  "0.65": profile_0_65,
  "0.66": profile_0_66,
  "0.67": profile_0_67,
  "0.68": profile_0_68,
  "0.69": profile_0_69,
  "0.70": profile_0_70,
};

export default preset;
