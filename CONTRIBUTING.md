# Contributing

This project welcomes contributions and suggestions!

- [Contributor License Agreement](#Contributor-License-Agreement)
- [Code of Conduct](#Code-of-Conduct)
- [Change Logs](#Change-Logs)
- [Releases](#Releases)

## Contributor License Agreement

Most contributions require you to agree to a Contributor License Agreement (CLA)
declaring that you have the right to, and actually do, grant us the rights to
use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

## Code of Conduct

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.

## Change Logs

Each package in this monorepo contains a change log. The log is built from
change descriptions submitted with each PR.

```
$ yarn change

Checking for changes against "origin/main"
fetching latest from remotes "origin/main"
Found changes in the following packages:
  @rnx-kit/cli
  @rnx-kit/config
  ...

Please describe the changes for: @rnx-kit/cli
? Change type › - Use arrow-keys. Return to submit.
❯   Patch      - bug fixes; no API changes.
    Minor      - small feature; backwards compatible API changes.
    None       - this change does not affect the published package in any way.
```

Follow the prompts and describe the changes you are making to each package. This
information is written in files under `/change`. Our CI loop uses these files to
bump package versions and update package change logs. The entire process is
coordinated by [Beachball](https://github.com/microsoft/beachball#beachball).

## Releases

Our release process is fully automated by
[Beachball](https://github.com/microsoft/beachball#beachball).

When a PR is merged, our CI loop uses `Beachball` to version-bump each changed
package and publish it to `npm`.
