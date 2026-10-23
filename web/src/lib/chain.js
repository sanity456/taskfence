import contractSource from '../../../contracts/taskfence.py?raw';
import deployment from '../../../deployment.json';

export const CHAIN_ID = 61999;
export const EXPLORER = 'https://explorer-studio.genlayer.com';
export const POLICY_VERSION = 'taskfence-doc-1';
export const POLICY_HASH = 'd547edb13a667a05d2ca67ec1438c5bbd89cd8d0f1c81216f3309a68df896511';
export const CONTRACT_SOURCE = contractSource;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const CONTRACT_KEY = 'taskfence:studionet:contract';
const PENDING_KEY = 'taskfence:studionet:pending';
let sdkPromise;

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([import('genlayer-js'), import('genlayer-js/chains')])
      .then(([sdk, chains]) => ({ createClient: sdk.createClient, studionet: chains.studionet }));
  }
  return sdkPromise;
}

export function validAddress(value) { return ADDRESS_RE.test(value || '') && !/^0x0{40}$/i.test(value); }
export function short(value) { return value ? `${value.slice(0, 7)}…${value.slice(-5)}` : '—'; }
export function provider() { return window.ethereum || null; }
export function configuredAddress() {
  const build = import.meta.env.VITE_TASKFENCE_ADDRESS || deployment.contractAddress;
  const local = localStorage.getItem(CONTRACT_KEY);
  return validAddress(build) ? build : validAddress(local) ? local : '';
}
export function saveAddress(address) {
  if (!validAddress(address)) throw new Error('The network did not return a valid TaskFence contract address.');
  localStorage.setItem(CONTRACT_KEY, address);
}
export function pendingAction() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch { return null; }
}
export function rememberPending(value) { localStorage.setItem(PENDING_KEY, JSON.stringify(value)); }
export function forgetPending() { localStorage.removeItem(PENDING_KEY); }

export async function ensureStudionet(wallet) {
  const { studionet } = await loadSdk();
  const chainHex = `0x${CHAIN_ID.toString(16)}`;
  const current = await wallet.request({ method: 'eth_chainId' });
  if (Number.parseInt(current, 16) === CHAIN_ID) return;
  try {
    await wallet.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainHex }] });
  } catch (error) {
    if (error?.code !== 4902) throw new Error('Switch MetaMask to GenLayer Studionet (chain 61999).');
    await wallet.request({ method: 'wallet_addEthereumChain', params: [{
      chainId: chainHex,
      chainName: studionet.name,
      nativeCurrency: studionet.nativeCurrency,
      rpcUrls: studionet.rpcUrls.default.http,
      blockExplorerUrls: [EXPLORER],
    }] });
  }
}

export async function requestWallet() {
  const wallet = provider();
  if (!wallet) throw new Error('MetaMask is required to use the live Studionet workflow.');
  const accounts = await wallet.request({ method: 'eth_requestAccounts' });
  const account = accounts?.[0];
  if (!validAddress(account)) throw new Error('No wallet account was selected.');
  await ensureStudionet(wallet);
  return account;
}

export async function client(account) {
  const { createClient, studionet } = await loadSdk();
  return createClient({ chain: studionet, ...(account ? { account, provider: provider() } : {}) });
}

export async function deploy(account) {
  return (await client(account)).deployContract({ code: CONTRACT_SOURCE, args: [] });
}
export async function read(address, functionName, args = []) {
  if (!validAddress(address)) throw new Error('Deploy TaskFence first.');
  return (await client()).readContract({ address, functionName, args });
}
export async function createPermission(address, agent, scope, seconds, account) {
  return (await client(account)).writeContract({
    address, functionName: 'create_permission', args: [agent, scope, BigInt(seconds)], value: 0n,
  });
}
export async function revokePermission(address, permissionId, account) {
  return (await client(account)).writeContract({ address, functionName: 'revoke_permission', args: [permissionId], value: 0n });
}
export async function proposeAction(address, permissionId, title, body, account) {
  return (await client(account)).writeContract({
    address, functionName: 'propose_action', args: [permissionId, title, body], value: 0n,
  });
}
export async function executeAction(address, actionId, title, body, account) {
  return (await client(account)).writeContract({
    address, functionName: 'execute_action', args: [actionId, title, body], value: 0n,
  });
}
export async function expireAction(address, actionId, account) {
  return (await client(account)).writeContract({ address, functionName: 'expire_action', args: [actionId], value: 0n });
}

export function successfulReceipt(receipt) {
  if (receipt?.statusName !== 'FINALIZED' && receipt?.status !== 7) return false;
  const consensusResult = receipt?.resultName ?? receipt?.result_name;
  if (consensusResult && consensusResult !== 'MAJORITY_AGREE') return false;
  const result = receipt?.txExecutionResultName ?? receipt?.txExecutionResult
    ?? receipt?.leader_receipt?.execution_result
    ?? receipt?.consensus_data?.leader_receipt?.[0]?.execution_result;
  return ['FINISHED_WITH_RETURN', 'SUCCESS'].includes(result) || result === 1;
}
export async function waitForFinality(hash) {
  const receipt = await (await client()).waitForTransactionReceipt({ hash, status: 'FINALIZED', interval: 5000, retries: 120 });
  if (!successfulReceipt(receipt)) throw new Error('This transaction finalized without a successful state change. Check its explorer entry.');
  return receipt;
}
export async function verifyContract(address) {
  const config = await read(address, 'get_config');
  if (config?.product !== 'TaskFence' || config?.policy_version !== POLICY_VERSION || config?.policy_hash !== POLICY_HASH) {
    throw new Error('This address is not the reviewed TaskFence release.');
  }
  return config;
}
export function explorerTx(hash) { return `${EXPLORER}/tx/${hash}`; }
export function explorerAddress(address) { return `${EXPLORER}/address/${address}`; }
export function safeError(error) {
  const message = String(error?.shortMessage || error?.message || 'Unknown error');
  if (/user rejected|user denied|rejected the request/i.test(message)) return 'You cancelled the MetaMask request. Nothing was recorded.';
  if (/permission|agent|action|content|scope|expired|revoke|studionet|metamask|finaliz|contract|address|policy/i.test(message)) return message.slice(0, 300);
  return 'The wallet or network could not complete that action. Check the transaction before retrying.';
}
