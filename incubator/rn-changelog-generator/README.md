# @rnx-kit/rn-changelog-generator

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/rn-changelog-generator)](https://www.npmjs.com/package/@rnx-kit/rn-changelog-generator)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This script used to live in
[react-native-community/releases](https://github.com/react-native-community/releases/blob/master/scripts/changelog-generator.ts),
and has moved here as part of deprecating that repo.

## Motivation

This script generates a markdown-formatted list of changes between two given
[git references](https://git-scm.com/book/en/v2/Git-Internals-Git-References)
(e.g. tags).

The script is a little more complex than one might expect for the following
reasons:

- Attributing changes to the author’s github handle requires fetching the commit
  metadata from the github API, rather than relying on a local clone of the
  react-native repo.

- Due to how react-native’s
  [release process](https://github.com/facebook/react-native/wiki/Release-Process)
  works, we want to be able to exclude previously cherry-picked commits from the
  changelog entry of the next version.

  However, with `git`, cherry-picked commits will have different commit hashes
  than their original counterparts – as they exist in the `main` branch. Because
  of this, the next version’s stable branch will include the same changes,
  except using their _original_ commit hash. This makes it impossible to exclude
  these commits without further work.

  For this reason, the script will parse the ‘referential revision’ – which is
  added to each commit message by Facebook’s infrastructure – and use it to
  resolve to the original commit in the `main` branch. This resolved commit’s
  hash is then used in the changelog entry, so the script can find and exclude
  it from the next version’s entry.

  This cannot be done via the github API and thus relies on a local clone of the
  react-native repo.

You can read more of the old documentation about it
[here](https://github.com/react-native-community/releases/blob/master/docs/generate-changelog.md).

## Setup

If you don’t already have a checkout of the react-native repo in a nearby
folder:

```bash
git clone https://github.com/facebook/react-native.git
```

Ensure the repo is up-to-date:

```bash
pushd react-native
git checkout main
git pull
popd
```

## Usage

Generate a changelog for `react-native` commits between versions 0.65.0 and
0.66.0:

```sh
npx @rnx-kit/rn-changelog-generator --base v0.65.0 --compare v0.66.0 --repo ../../../react-native --changelog ../../../react-native/CHANGELOG.md
```

As explained above, you will need to have a local clone of `react-native`, which
is referenced by the `--repo` parameter.

### [Optional] Get a Github 'personal acccess token'

This script uses the Github API to fetch commit metadata. This data is
accessable without authentication as its public.

You can optionally provide a GitHub personal access token for the `--token`
parameter which may be necessary in case Github API rate-limits your requests.

Instructions to create a GitHub ‘personal access token’:

1. Visit the [token settings page](https://github.com/settings/tokens).
1. Generate a new token and **only** give it the `public_repo` scope.
1. Store this token somewhere secure for future usage.
