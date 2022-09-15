# React Native Developer Tools RFCs

Welcome, and thank you for taking the time to contribute to this project!

The "RFC" (request for comments) process is intended to provide a consistent and
controlled path for making changes to `rnx-kit` so that all stakeholders can be
confident about the direction of the project.

Many changes, including bug fixes and documentation improvements, can be
implemented and reviewed using the normal GitHub pull request workflow.

Some changes, though, are "substantial", and we ask that these be put through a
bit of a design process and produce a consensus among the community and core
development team.

[Accepted RFC List](https://github.com/microsoft/rnx-kit/issues?q=is%3Aissue+is%3Aopen+label%3ARFC)

## When to follow this process

You should consider using this process if you intend to make "substantial"
changes to `rnx-kit`. Some examples that would benefit from an RFC are:

- Creating a new tool or API surface
- Removing code that has already shipped
- The introduction of new idiomatic usage or conventions, even if they do not
  include code changes

Some changes do not require an RFC:

- Rephrasing, reorganizing or refactoring
- Additions that strictly improve objective, numerical quality criteria
  (speedup, better browser support)
- Additions only likely to be _noticed by_ other implementors, yet be invisible
  to users.

## Before proposing an RFC

A hastily-proposed RFC can hurt its chances of acceptance. Low quality
proposals, proposals for previously-rejected ideas, or those that don't fit into
the roadmap, may be quickly rejected. This can be demotivating for the
unprepared contributor. Laying some groundwork ahead of the RFC can make the
process smoother.

Although there is no single way to prepare for submitting an RFC, it is
generally a good idea to pursue feedback from other developers beforehand, to
ascertain whether or not the RFC is desirable. You can use a new
[discussion topic](https://github.com/microsoft/rnx-kit/discussions) for this
purpose. Expect that throughout the RFC process, you will need to make a
concerted effort toward consensus-building.

As a rule of thumb, receiving encouraging feedback from long-standing project
developers, and particularly members of the core team, is a good indication that
the RFC is worth pursuing.

## From proposal to acceptance

In short, to get a major feature added to `rnx-kit`, you must first get an RFC
proposal accepted. Once accepted, the RFC is merged into the `rfcs` branch and
may be implemented with the goal of eventual inclusion into `rnx-kit`.

- Fork the `rnx-kit` repo http://github.com/microsoft/rnx-kit
- Check out the `rfcs` branch
- Copy `0000-template.md` to `text/0000-rfc-title.md` (where "rfc-title" is a
  unique title in kebab-case. Don't assign an RFC number).
- Fill in the RFC. Put care into the details: **RFCs that do not present
  convincing motivation, demonstrate understanding of the impact of the design,
  or are disingenuous about the drawbacks or alternatives, tend to be
  poorly-received**.
- Submit a pull request targeting the `rfcs` branch. The RFC will receive design
  feedback from the larger community, and the author should be prepared to
  revise it in response.
- Build consensus and integrate feedback. An RFC that has broad support is much
  more likely to make progress.
- Eventually, the core team will decide whether the RFC is a candidate for
  inclusion in `rnx-kit`. Note that a core team review may take a long time, and
  we suggest that you ask members of the community to review it first.
- If the RFC is a candidate for inclusion, it will enter a "final comment
  period" lasting 7 calendar days. The beginning of this period will be signaled
  with a comment and label on the pull request.
- The RFC can be modified based upon feedback from the core team and the
  community. Significant modifications may trigger a new final comment period.
- The RFC may be rejected by the core team after public discussion has settled
  and comments have been made summarizing the rationale for rejection. A member
  of the core team will then close the associated pull request.
- The RFC may be accepted after the final comment period. A core team member
  will then assign an id number to the RFC, create a matching issue in
  `rnx-kit`, and merge the RFC pull request.

## Accepted RFC lifecycle

Once the RFC is accepted, anyone may implement it and submit their work as a
pull request to the `rnx-kit` repo. While it is not necessary that the author of
the RFC write the implementation, it is by far the most effective way to see an
RFC through to completion. Authors should not expect other developers to take on
the responsibility of implementing their accepted proposal.

Becoming accepted is not a rubber stamp, and in particular does not mean a pull
request will ultimately be merged. Instead, it means that the core team has
agreed to the RFC in principle and is amenable to merging it. Further, the fact
that the RFC is accepted implies nothing about what priority is assigned to its
implementation, nor whether anyone is currently working on it.

Once accepted, an RFC should not be substantially changed. Only minor amendments
should be submitted through follow-up pull requests. These typically occur in
response to changing code and documentation in the `rnx-kit` repository. If
substantial changes are needed, a new RFC must be proposed, with a note added to
the original RFC.

## RFC review process

While an RFC pull request is open, the core team may schedule meetings with the
author and/or relevant stakeholders to discuss the issues in greater detail. In
some cases, the topic may be discussed at a core team meeting. In either case, a
meeting summary will be posted back to the RFC pull request.

The core team will eventually make a final decision about each RFC after the
benefits and drawbacks are well understood. These decisions can be made at any
time. Once a decision is made, the RFC pull request will either be merged or
closed. In either case, if the reasoning is not clear from the pull request
discussion, the core team will add a comment describing the rationale for the
decision.

## Inspiration

The `rnx-kit` RFC process owes its inspiration to the
[Rust RFC process](https://github.com/rust-lang/rfcs), the
[React RFC process](https://github.com/reactjs/rfcs), and the
[NPM RFC process](https://github.com/npm/rfcs).

This is an evolving process, and we are open to improving it.
