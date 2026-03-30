# @rnx-kit/commitlint-lite

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/commitlint-lite)](https://www.npmjs.com/package/@rnx-kit/commitlint-lite)

Lint commit message according to
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Usage

Pipe the commit message to `@rnx-kit/commitlint-lite`:

```sh
echo 'ci: lint commit messages' | npx @rnx-kit/commitlint-lite
```

**Example:** In a PR, only the first commit's message needs to conform if you
always squash before merging:

```sh
git log --format='%s' origin/trunk..HEAD | tail -1 | npx @rnx-kit/commitlint-lite
```
