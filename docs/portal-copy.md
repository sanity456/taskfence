# Portal submission draft — do not submit until live proof is complete

## Title

TaskFence: consensus-scoped permissions for autonomous agents

## Changes & improvements

TaskFence is a GenLayer-native permission layer for AI agents. An owner freezes one bounded natural-language permission for a separate agent wallet; a clarity consensus rejects vague or open-ended authority before it exists. The agent then proposes an exact documentation issue, and validators independently return IN_SCOPE, OUT_OF_SCOPE, or UNCLEAR with a fixed reason code and verbatim action evidence. Only IN_SCOPE can execute. Deterministic guards require the assigned wallet, unchanged title/body, active permission, live 24-hour approval, zero contract value, and one-time use. Revocation, expiry, changed content, replay, unauthorized wallets, and known evaluator-override text fail closed. The complete app includes a public audit ledger, on-chain demo issue board, pending-transaction recovery, pinned runner and policy hash, direct tests, reproducible docs, and a proof manifest for finalized StudioNet cases.

## Note

The MVP deliberately supports one action—creating documentation issues on TaskFence’s on-chain demo board—so reviewers can verify the full authority-to-consequence path without a trusted repository token. Consensus classifies scope; deterministic code alone executes. StudioNet is a test network, contract value is always 0 GEN, and network fees may apply. Local tests mock model output, so the linked explorer transactions are the live consensus evidence.

## Evidence & supporting information

Add only after publication and end-to-end testing:

1. Public GitHub repository — source, tests, docs, and pinned policy.
2. Public web app — reviewer walkthrough and live contract state.
3. GenLayer Explorer contract — verified TaskFence deployment.
4. Explorer transactions — clear permission, allowed review, exact execution, changed-content failure, scope escape, unclear case, injection rejection, replay, revocation, and expiry.
