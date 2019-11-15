# React Native Developer Tools RFCs

Welcome, and thank you for your interest in this project!

Many changes, including bug fixes and documentation improvements can be
implemented and reviewed via the normal GitHub pull request workflow.

Some changes, though, are "substantial", and we ask that these be put through a
bit of a design process and produce a consensus among the core development team.

The "RFC" (request for comments) process is intended to provide a consistent and
controlled path for new features to enter the project.

[Active RFC List](https://github.com/microsoft/rnx-kit/pulls?q=is%3Aopen+is%3Apr+label%3ARFC)

## When to follow this process

You should consider using this process if you intend to make "substantial"
changes to `rnx-kit` or its documentation. Some examples that would benefit from
an RFC are:

- A new tool or API surface area
- The removal of features that have already shipped
- The introduction of new idiomatic usage or conventions, even if they do not
  include code changes

Some changes do not require an RFC:

- Rephrasing, reorganizing or refactoring
- Addition or removal of warnings
- Additions that strictly improve objective, numerical quality criteria
  (speedup, better browser support)
- Additions only likely to be _noticed by_ other implementors, yet invisible to
  users.

## Before proposing an RFC

A hastily-proposed RFC can hurt its chances of acceptance. Low quality
proposals, proposals for previously-rejected ideas, or those that don't fit into
the near-term roadmap, may be quickly rejected, which can be demotivating for
the unprepared contributor. Laying some groundwork ahead of the RFC can make the
process smoother.

Although there is no single way to prepare for submitting an RFC, it is
generally a good idea to pursue feedback from other project developers
beforehand, to ascertain whether or not the RFC is desirable. You can use a new
[discussion topic](https://github.com/microsoft/rnx-kit/discussions) for this
purpose. Expect that throughout the RFC process, you will need to make a
concerted effort toward consensus-building.

As a rule of thumb, receiving encouraging feedback from long-standing project
developers, and particularly members of the core team, is a good indication that
the RFC is worth pursuing.

## From proposal to acceptance

In short, to get a major feature added to `rnx-kit`, you must first get an RFC
proposal accepted and merged into the `rfcs` branch. At that point, the RFC is
"active" and may be implemented with the goal of eventual inclusion into
`rnx-kit`.

- Fork the `rnx-kit` repo http://github.com/microsoft/rnx-kit
- Check out the `rfcs` branch
- Copy `0000-template.md` to `text/0000-my-feature.md` (where "my-feature" is
  descriptive. Don't assign an RFC number).
- Fill in the RFC. Put care into the details: **RFCs that do not present
  convincing motivation, demonstrate understanding of the impact of the design,
  or are disingenuous about the drawbacks or alternatives tend to be
  poorly-received**.
- Submit a pull request. As a pull request, the RFC will receive design feedback
  from the larger community, and the author should be prepared to revise it in
  response.
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
  will then assign an id number to the RFC and merge the associated pull
  request. The RFC is now "active".

## Accepted RFC lifecycle

Once the RFC becomes "active", anyone may implement it and submit the code or
documentation as a pull request to the `rnx-kit` repo. While it is not necessary
that the author of the RFC also write the implementation, it is by far the most
effective way to see an RFC through to completion. Authors should not expect
that other project developers will take on responsibility for implementing their
accepted feature.

Becoming "active" is not a rubber stamp, and in particular does not mean the
pull request will ultimately be merged. Instead, it means that the core team has
agreed to the RFC in principle and is amenable to merging it. Further, the fact
that the RFC is "active" implies nothing about what priority is assigned to its
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

The core team eventually will make a final decision about each RFC after the
benefits and drawbacks are well understood. These decisions can be made at any
time. Once a decision is made, the RFC pull request will either be merged or
closed. In either case, if the reasoning is not clear from the discussion in
thread, the core team will add a comment describing the rationale for the
decision.

## Inspiration

The `rnx-kit` RFC process owes its inspiration to the
[Rust RFC process](https://github.com/rust-lang/rfcs) and the
[React RFC process](https://github.com/reactjs/rfcs).

This is an evolving process, and we are open to improving it.
