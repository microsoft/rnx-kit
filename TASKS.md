# Daily and Milestone Tasks Checklist

## Goals

- [ ] **Dev Experience Improvements ([roadmap](./ROADMAP.md))**
  - [ ] Make rnx-kit the best choice for library and app development.
  - [ ] Simplify initial setup and reduce required tooling.
  - [ ] Effortless module inclusion and RN version management.
  - [ ] Provide standardized APIs across platforms (React Native WebAPIs).
  - [ ] Enhance JS bundling workflows (Metro plugins, tree-shaking).
  - [ ] Integrate cloud-based native app builds (`@rnx-kit/build`).
  - [ ] Participate in and leverage new debugging tools.

---

## Daily Tasks

- [ ] **Issue Triage & Maintenance**
  - [ ] Review new issues and pull requests, apply labels.
  - [ ] Respond to questions, bug reports, and feature requests.
  - [ ] Update and close resolved issues.
  - [ ] Monitor the
        [Dependency Dashboard](https://github.com/microsoft/rnx-kit/issues/1680)
        for updates.
  - [ ] Review and address
        [security alerts](https://github.com/microsoft/rnx-kit/security).

- [ ] **Continuous Integration (CI)**
  - [ ] Ensure CI builds succeed for all supported platforms and Node versions.
  - [ ] Address failing builds or flaky tests.
  - [ ] Review Renovate PRs for dependency updates.

- [ ] **Platform-Specific Upkeep**
  - [ ] Track upstream changes in React Native, Metro, and platform SDKs.
  - [ ] Test and maintain compatibility with Android, iOS, macOS, Windows.

- [ ] **Documentation**
  - [ ] Update
        [`README`](https://github.com/microsoft/rnx-kit/blob/trunk/README.md)
        and [wiki](https://github.com/microsoft/rnx-kit/wiki) for new features,
        changes, or configuration.
  - [ ] Write or update how-to guides (see issues
        [#1260](https://github.com/microsoft/rnx-kit/issues/1260),
        [#1269](https://github.com/microsoft/rnx-kit/issues/1269),
        [#1296](https://github.com/microsoft/rnx-kit/issues/1296),
        [#1280](https://github.com/microsoft/rnx-kit/issues/1280),
        [#1341](https://github.com/microsoft/rnx-kit/issues/1341)).

- [ ] **Community Engagement**
  - [ ] Monitor GitHub discussions for feedback and feature requests.
  - [ ] Engage with contributors and reviewers.

---

## Future Milestones & Development Areas

- [ ] **Tooling Improvements**
  - [ ] Improve dependency management in `@rnx-kit/align-deps`
        ([issue #3221](https://github.com/microsoft/rnx-kit/issues/3221),
        [#2906](https://github.com/microsoft/rnx-kit/issues/2906),
        [#2457](https://github.com/microsoft/rnx-kit/issues/2457),
        [#1335](https://github.com/microsoft/rnx-kit/issues/1335),
        [#1299](https://github.com/microsoft/rnx-kit/issues/1299),
        [#2454](https://github.com/microsoft/rnx-kit/issues/2454)).
  - [ ] Improve JS bundling and Metro plugin architecture
        ([issue #3617](https://github.com/microsoft/rnx-kit/issues/3617),
        [#2257](https://github.com/microsoft/rnx-kit/issues/2257),
        [#1290](https://github.com/microsoft/rnx-kit/issues/1290)).
  - [ ] Tree-shaking improvements and guides
        ([issue #1280](https://github.com/microsoft/rnx-kit/issues/1280)).
  - [ ] CLI improvements for WebAPIs, verbose logging, and usability
        ([issue #2596](https://github.com/microsoft/rnx-kit/issues/2596),
        [#3329](https://github.com/microsoft/rnx-kit/issues/3329)).
  - [ ] Add Node performance mark integration in reporter
        ([issue #3800](https://github.com/microsoft/rnx-kit/issues/3800)).

- [ ] **Platform Support Expansions**
  - [ ] Add support for new platforms in `react-native-host`
        ([issue #2587](https://github.com/microsoft/rnx-kit/issues/2587),
        [#2586](https://github.com/microsoft/rnx-kit/issues/2586),
        [#2243](https://github.com/microsoft/rnx-kit/issues/2243)).
  - [ ] Investigate Node's new JS APIs for compile cache
        ([issue #3598](https://github.com/microsoft/rnx-kit/issues/3598)).
  - [ ] Integrate new Node features (e.g., `findPackageJSON`
        [#3584](https://github.com/microsoft/rnx-kit/issues/3584)).

- [ ] **Web API Standardization**
  - [ ] Figure out and prioritize WebAPIs for implementation
        ([issue #2595](https://github.com/microsoft/rnx-kit/issues/2595)).
  - [ ] Improve CLI generator for WebAPIs
        ([issue #2596](https://github.com/microsoft/rnx-kit/issues/2596)).

- [ ] **Testing & Validation**
  - [ ] End-to-end tests for CLI and bundling features
        ([#1294](https://github.com/microsoft/rnx-kit/issues/1294),
        [#1268](https://github.com/microsoft/rnx-kit/issues/1268)).
  - [ ] Add fine-grained control for TypeScript validation
        ([issue #1420](https://github.com/microsoft/rnx-kit/issues/1420)).
  - [ ] Ensure TypeScript Metro plugin builds project references
        ([issue #3343](https://github.com/microsoft/rnx-kit/issues/3343)).

- [ ] **Release Management**
  - [ ] Track and communicate breaking changes.
  - [ ] Maintain compatibility matrix with React Native and platforms.

- [ ] **Metrics & Community Feedback**
  - [ ] Track adoption rates, time savings, efficiency gains.
  - [ ] Gather and incorporate feedback from users and contributors.

---

See all current
[open issues and PRs](https://github.com/microsoft/rnx-kit/issues) for details
and progress tracking.
