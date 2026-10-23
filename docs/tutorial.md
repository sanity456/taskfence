# TaskFence tutorial

## 1. Deploy and connect

Open the app, connect MetaMask to GenLayer Studionet (chain `61999`), and deploy the contract from the owner wallet. The app verifies product name, policy version, and policy hash before enabling writes.

## 2. Freeze a permission

Enter a different agent wallet. Keep the permission specific: name the documentation area, exact requested change, and explicit exclusions. The sample is intentionally limited to the public REST API authentication guide. Vague authority is rejected before it becomes a permission.

## 3. Switch to the agent wallet

Use the permission ID shown in the ledger. Submit the exact issue title and body. The validator result is public: `IN_SCOPE`, `OUT_OF_SCOPE`, or `UNCLEAR`, with a stable reason code and exact action excerpt.

## 4. Execute only an approval

For an `APPROVED` action, press **Execute exact approved issue**. The app sends the same title/body again so the contract can deterministically reject any change. Successful execution creates an `I` record on the public demo board and consumes the one-time permission.

## 5. Audit and recover

Every permission, review, and issue is readable without a wallet. Pending transaction hashes are saved in browser storage so a refresh cannot invite an accidental duplicate. Use **Check status** after finality or open the explorer link.

## 6. Reproduce locally

Run `npm run build`, the GenVM lint command from the README, `pytest tests/direct -q`, and `npm run verify:proof`. Direct tests mock model output and must be paired with the required StudioNet cases before submission.
