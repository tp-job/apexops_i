Grouping is the decision that makes the product usable. Without it, the first real integration makes the interface useless and the database large on the same afternoon.

## Fingerprints

Every event is hashed into a fingerprint from four inputs:

```text
fingerprint = hash(projectId, level, normalizedMessage, culprit)
```

Events sharing a fingerprint are the same issue. The issue's count increases; no new row appears in the list.

## Message normalization

Before hashing, the message has its variable parts replaced: numbers, UUIDs and quoted strings. This is what makes the following two messages one issue rather than two:

```text
User 4821 not found   ─┐
                       ├─→  User <n> not found
User 9134 not found   ─┘
```

Without normalization, an error containing an id produces a new issue on every occurrence, which is the same failure as having no grouping at all.

## Culprit

The culprit is the first stack frame that belongs to your application, reduced to `filename:line`. Frames inside the SDK itself are skipped — otherwise every captured error would share one culprit and unrelated bugs would collapse into a single issue.

:::callout{tone=warn title="Two different failure modes"}
Over-splitting is obvious: a flood of near-identical issues. Over-collapsing is not — the list looks tidy while hiding distinct bugs behind one row.
:::

## Counts vs stored events

An issue's **count** and the number of stored events are different numbers, and only the first grows without bound.

When the SDK collapses 500 repeats inside its dedupe window, it sends one event carrying `count: 500`. The issue total rises by 500; one event row is stored. So *how often it happened* stays accurate while *how many samples we kept* stays bounded.

## Status behaviour

| Status {w-36} | Meaning |
| --- | --- |
| `unresolved` | Open. The default for anything newly seen. |
| `resolved` | Fixed. **If it recurs it flips back to unresolved** — a regression belongs at the top of the list. |
| `ignored` | Known and unwanted. A recurrence does **not** reopen it; you asked not to be told. |

## Retention

Raw events are kept for the project's retention window — 30 days by default, configurable from 1 to 365 in project settings. **Issue aggregates are never pruned**, so counts and first-seen dates survive after the underlying events are gone.

A prune job runs on a schedule and deletes in bounded batches, so the first prune after a busy period does not lock the table the SDK is writing into.
