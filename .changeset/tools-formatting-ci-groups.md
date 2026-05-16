---
"@rnx-kit/tools-formatting": minor
---

Add CI log integration helpers for GitHub Actions and Azure Pipelines.

- `formatAsTree` now automatically wraps its output in collapsible-group markers (`::group::` / `##[group]`) when run on a supported CI. Controllable via the new `group` option (`"auto"`, `"github"`, `"azure"`, `"none"` / `false`).
- New `formatAnnotation` helper formats diagnostics as inline CI annotations (`::error file=...,line=...::message` on GitHub, `##vso[task.logissue type=error;...]message` on Azure) or a GCC/Clang-style plain line locally.
- New CI-detection / marker helpers exported for reuse: `isGitHubActions`, `isAzurePipelines`, `detectGroupProvider`, `resolveGroupProvider`, `groupStart`, `groupEnd`, `wrapInGroup`, plus the `GroupMode` / `GroupProvider` / `Annotation` / `AnnotationSeverity` types.
