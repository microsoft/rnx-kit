# Dependency Management

:::danger Draft Content

This page needs to be converted from a draft to real instructions.

Guides should be step-by-step instructions. Devs use them to complete a task.
Doing, not learning. If you want to explain why, add notes
[here](/docs/dependencies)

:::

## On-boarding

- use vigilant mode first to establish a baseline
- work through the warnings/errors that it uncovers
- add validation check to CI loops for PRs and builds
- configure (init) one package at a time, manually reviewing output
- repeat until all packages are configured
- keep vigilant mode running in CI so that new packages are validated

## Updating Dependencies

- when: after dep-check update (new profile data), when adding/removing
  capabilties
- run dep-check with --write on all packages in monorepo
- review results manually
- run full test suite to validate apps

## Upgrading React Native

- update dep-check to get latest profile data
- set-version command across all packages (will update dependencies
  automatically)
- review results manually
- run full test suite to validate apps

## Using a Custom Profile

- NOTE: This isn't covered in the dep-check [article](/docs/dependencies); add
  it there and keep this focused on the "How"
- create profile and link into package config wherever needed
- run dep-check --write across the repo
- review results manually
- run full test suite to validate apps
- encourage [contributing](/docs/contributing) through an issue or a PR
