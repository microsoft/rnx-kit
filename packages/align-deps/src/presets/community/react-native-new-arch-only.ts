import type { Preset } from "../../types";
import profile_0_70 from "./react-native-new-arch-only/profile-0.70";

// Also export this by name for scripts to work around a bug where this module
// is wrapped twice, i.e. `{ default: { default: preset } }`, when imported as
// ESM.
export const preset: Readonly<Preset> = {
  "0.70": profile_0_70,
};

export default preset;
