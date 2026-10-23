# TaskFence architecture

## Decision boundary

`owner intent → frozen on-chain permission → agent's exact action → independent validator classification → fixed verdict → deterministic execution guards → on-chain demo issue`

The only nondeterministic question is: **Does the complete proposed documentation issue stay entirely inside the complete frozen permission?** The model cannot execute, edit, revoke, extend, or reuse authority.

## Consensus protocol

Permission creation uses a separate clarity gate. The leader and validators independently classify the candidate as `CLEAR` or `VAGUE` and compare the verdict plus reason code. A leader must provide an exact excerpt from the permission. Only `CLEAR` is stored.

Action review returns exactly:

```json
{"verdict":"IN_SCOPE|OUT_OF_SCOPE|UNCLEAR","reason_code":"…","quote":"exact action excerpt"}
```

Validators independently rerun the classification, compare verdict and reason code, confirm the quote is a verbatim action substring, and separately judge whether it supports the claimed result. Inputs are explicitly delimited as untrusted evidence. Known evaluator-override phrases are rejected before the model call.

## Deterministic safety invariants

- Only the assigned agent can propose or execute.
- Owner and agent must be distinct wallets.
- Contract value must be zero for every write.
- Permission must be clear, unrevoked, unexpired, and unused.
- Approval must be `IN_SCOPE`, unexpired, and unexecuted.
- Execution receives the expected title/body and requires exact equality with approved content.
- One permission creates at most one issue.
- Blocked and unclear actions are auditable but cannot execute.
- An expired approval can be explicitly closed to `EXPIRED`.

## Storage model

The single contract keeps canonical JSON records in `TreeMap` storage and ordered identifiers in `DynArray` indexes. This avoids unsupported Python collection storage while preserving reviewer-readable views. IDs are deterministic monotonic labels: `F1` permissions, `A1` actions, and `I1` issues.

## Why the board is on-chain

Direct GitHub mutation would introduce a trusted credentialed backend and make the final effect harder to reproduce. The MVP instead creates a real, public, irreversible-for-that-contract issue record on a demo board. A production adapter can listen for executed issues and mirror them externally, but external mutation is intentionally outside the scored trust boundary.

## Failure and timeout policy

A transaction that never finalizes creates no state. The browser saves the transaction hash for recovery instead of silently retrying. Permissions expire between 15 minutes and 30 days. Approved actions expire after 24 hours. Anyone may mark an overdue approval expired, but nobody can execute it.
