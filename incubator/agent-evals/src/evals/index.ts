import type { TestCase } from "../types.ts";
import { benchmarkTimings } from "./benchmark-timings.ts";
import { changesetRequired } from "./changeset-required.ts";
import { coverageDifference } from "./coverage-difference.ts";
import { designApproval } from "./design-approval.ts";
import { filesystemMocks } from "./filesystem-mocks.ts";
import { fixtureReuse } from "./fixture-reuse.ts";
import { formatAndLintWithYarn } from "./format-and-lint-with-yarn.ts";
import { ignoreDependencyDashboard } from "./ignore-dependency-dashboard.ts";
import { noChangesetForIgnoredPackages } from "./no-changeset-for-ignored-packages.ts";
import { noGlobalOverrides } from "./no-global-overrides.ts";
import { noModifyingOthersPRs } from "./no-modifying-others-prs.ts";
import { prototypeStaging } from "./prototype-staging.ts";
import { testGlobWithArguments } from "./test-glob-with-arguments.ts";

export const evals: Record<string, TestCase> = {
  // From AGENTS.md
  "changeset-required": changesetRequired,
  "no-changeset-for-ignored-packages": noChangesetForIgnoredPackages,
  "no-global-overrides": noGlobalOverrides,
  "format-and-lint-with-yarn": formatAndLintWithYarn,
  "test-glob-with-arguments": testGlobWithArguments,
  "filesystem-mocks": filesystemMocks,
  "ignore-dependency-dashboard": ignoreDependencyDashboard,
  // From user preferences
  "design-approval": designApproval,
  "coverage-difference": coverageDifference,
  "no-modifying-others-prs": noModifyingOthersPRs,
  "prototype-staging": prototypeStaging,
  "fixture-reuse": fixtureReuse,
  "benchmark-timings": benchmarkTimings,
};
