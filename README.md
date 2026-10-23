# TaskFence

TaskFence is a GenLayer-native permission layer for autonomous agents. An owner freezes one narrow natural-language permission for one agent wallet. The agent submits the exact title and body of a documentation issue. GenLayer validators decide one question—whether that action is entirely inside the permission—and deterministic contract code executes only an unchanged, active, unused approval.

The MVP deliberately supports one action: `CREATE_DOC_ISSUE` on an on-chain demo documentation board. It does **not** modify a real GitHub repository. This keeps the live consequence auditable without requiring a trusted backend or repository token.

## Why GenLayer is essential

Normal code can check wallet identity, expiry, revocation, replay, and exact string equality. It cannot reliably turn a natural-language permission such as “document expired-token recovery, but do not request code or secret changes” into a deterministic scope check. TaskFence gives that single subjective judgment to validator consensus, then returns to deterministic enforcement.

Boundary of responsibility:

- Frontend: wallet connection, readable previews, transaction recovery, and public history.
- Intelligent Contract: clarity gate, permission/action evidence, consensus verdict, deterministic execution guards, and demo issue state.
- Validator model: one fixed classification only; it never executes an action or chooses the consequence.
- User: signs every Studionet transaction. The app never accepts GEN as contract value; network fees may apply.

## Contract flow

1. `create_permission(agent, scope, duration)` asks validators whether the permission is specific enough to freeze. `VAGUE` permissions revert and create no authority.
2. The assigned agent calls `propose_action(permission_id, title, body)`. Validators return `IN_SCOPE`, `OUT_OF_SCOPE`, or `UNCLEAR`, an allowed reason code, and an exact quote from the proposed action.
3. Only `IN_SCOPE` creates an executable approval. Other verdicts remain public but blocked.
4. `execute_action(action_id, expected_title, expected_body)` deterministically checks the assigned wallet, exact content, permission expiry/revocation/use, and approval expiry. It then creates one issue on the on-chain demo board.
5. Replays, changed content, revoked permission, stale approvals, unauthorized wallets, and non-zero transaction value revert.

## Local development

Requirements: Node.js 24 and Python 3.12 with the packages in `requirements-dev.txt`.

```powershell
npm install
npm run build
$env:GENVM_VERSION='v0.2.16'
$env:PYTHONIOENCODING='utf-8'
genvm-lint check contracts/taskfence.py --json
pytest tests/direct -q
npm run dev
```

The direct tests mock model results. They prove deterministic business rules and result parsing; they do not prove live validator agreement. A complete submission requires the StudioNet cases listed in `docs/demo.md`, with finalized transaction links added to `deploy/proof.json`.

## Network and release policy

- Network: GenLayer Studionet, chain ID `61999`
- Explorer: `https://explorer-studio.genlayer.com`
- Contract runner: pinned in the first source line; no `test` or `latest` alias
- Policy version: `taskfence-doc-1`
- Policy hash: `d547edb13a667a05d2ca67ec1438c5bbd89cd8d0f1c81216f3309a68df896511`
- Contract value: always `0 GEN`; normal network fees may apply

## Evidence standard

Do not describe expected cases as live proof. `deploy/proof.json` starts as `NOT_DEPLOYED`. After the human-signed end-to-end run, record the exact contract address and finalized transaction hashes, then run `npm run verify:proof`. The verifier checks the pinned policy/source hash and rejects incomplete or malformed proof entries.

## Honest limitations

- The MVP covers documentation-issue creation, not arbitrary agent tools.
- Prompt-injection defenses reduce risk but do not prove protection against every adversarial phrasing.
- A consensus verdict says the action matched the frozen policy under the deployed contract; it is not a general safety certification.
- Studionet is a test network and test GEN has no monetary value.
