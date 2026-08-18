# Technical brief: [Proposal title]

> One sentence that explains the decision this document asks readers to make.

**Owner:** [Name or team]

**Status:** Draft

**Last updated:** 2026-08-15

**Decision deadline:** [Date]

## Summary

Describe the proposed change, the user or business outcome, and the decision needed from reviewers. Keep this section understandable without reading the rest of the document.

## Context

Explain the current state and the problem with evidence. Include relevant constraints, affected users, and why the issue needs attention now.

## Goals

- Improve [user or system outcome].
- Reduce [cost, risk, latency, or maintenance burden].
- Preserve [important compatibility, privacy, or reliability constraint].

## Non-goals

- This proposal does not introduce [explicitly excluded capability].
- This proposal does not solve [adjacent but separate problem].

## Proposal

Describe the recommended approach in enough detail for an engineer or stakeholder to assess feasibility.

### User flow

1. A user starts from [entry point].
2. The system performs [key action].
3. The user receives [visible result].
4. The user can recover from [failure or edge case].

### Technical design

```text
Client action
  → validation
  → local or service processing
  → user-visible result
  → measurement and recovery path
```

Document APIs, data models, storage, permissions, and failure states where relevant.

## Alternatives considered

| Alternative | Advantages | Trade-offs | Decision |
| :--- | :--- | :--- | :--- |
| Keep the current approach | Lowest short-term effort | Does not solve the stated problem | Rejected |
| Proposed approach | Best balance of user value and maintainability | Requires focused implementation work | Recommended |
| Broader platform redesign | Could unlock future features | Higher cost and scope risk | Deferred |

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :---: | :---: | :--- |
| [Risk] | Medium | High | [Mitigation and owner] |
| [Risk] | Low | Medium | [Mitigation and owner] |

## Rollout plan

1. Build behind a controlled release path.
2. Test the critical user journey and failure states.
3. Release to a small audience and monitor the agreed metrics.
4. Expand availability when the exit criteria are met.

## Success metrics

| Metric | Baseline | Target | Review window |
| :--- | :---: | :---: | :--- |
| [Activation or completion metric] | [Current] | [Target] | [Time period] |
| [Performance or reliability metric] | [Current] | [Target] | [Time period] |

## Open questions

- [Question requiring a decision]
- [Question requiring validation]
- [Question requiring an owner]
