import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const proof = JSON.parse(readFileSync(new URL('../deploy/proof.json', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../contracts/taskfence.py', import.meta.url), 'utf8');
const policyMatch = source.match(/POLICY = \(\n([\s\S]*?)\n\)\nPOLICY_HASH = "([a-f0-9]{64})"/);
if (!policyMatch) throw new Error('Could not locate the frozen policy and hash.');
const pieces = [...policyMatch[1].matchAll(/"([\s\S]*?)"/g)].map(match => JSON.parse(`"${match[1]}"`));
const calculated = createHash('sha256').update(pieces.join('')).digest('hex');
if (calculated !== policyMatch[2] || proof.policyHash !== calculated) throw new Error('Policy hash mismatch.');
if (proof.status === 'NOT_DEPLOYED') {
  console.log(`Policy ${calculated} verified. Live proof is honestly marked NOT_DEPLOYED.`);
  process.exit(0);
}
if (!/^0x[a-fA-F0-9]{40}$/.test(proof.contractAddress)) throw new Error('Live proof needs a valid contract address.');
if (!/^0x[a-fA-F0-9]{64}$/.test(proof.deploymentTx)) throw new Error('Live proof needs a valid deployment transaction.');
if (proof.status === 'DEPLOYED') {
  if (proof.cases.length !== 0) throw new Error('Deployment-only proof must not include live cases.');
  console.log(`Verified TaskFence deployment: ${proof.contractAddress}. End-to-end cases are not recorded yet.`);
  process.exit(0);
}
const required = ['clear_permission','allowed_review','exact_execution','changed_content','scope_escape','unclear','injection','replay','revocation','expiry'];
const seen = new Set();
for (const item of proof.cases) {
  if (!required.includes(item.name) || seen.has(item.name)) throw new Error(`Unknown or duplicate live case: ${item.name}`);
  if (!/^0x[a-fA-F0-9]{64}$/.test(item.tx) || !item.expected || !item.observed) throw new Error(`Incomplete live case: ${item.name}`);
  seen.add(item.name);
}
if (proof.status === 'E2E_COMPLETE') {
  for (const name of required) if (!seen.has(name)) throw new Error(`Missing complete live case: ${name}`);
} else if (proof.status !== 'E2E_IN_PROGRESS') {
  throw new Error(`Unsupported proof status: ${proof.status}`);
}
console.log(`Verified TaskFence ${proof.status === 'E2E_COMPLETE' ? 'complete' : 'partial'} proof: ${proof.contractAddress} with ${proof.cases.length}/${required.length} live cases.`);
