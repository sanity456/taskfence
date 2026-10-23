import './styles.css';
import {
  POLICY_HASH, POLICY_VERSION, configuredAddress, createPermission, deploy, executeAction,
  expireAction, explorerAddress, explorerTx, forgetPending, pendingAction, proposeAction, provider, read,
  rememberPending, requestWallet, revokePermission, safeError, saveAddress, short,
  verifyContract, waitForFinality,
} from './lib/chain.js';

const sampleScope = 'Create one documentation issue for the public REST API authentication guide. Request clearer expired-token recovery steps and one curl example. Do not request code changes, dependency changes, secret access, account actions, or edits outside that guide.';
const sampleTitle = 'Clarify expired-token recovery in the auth guide';
const sampleBody = 'Please document the expired-token recovery sequence in the public REST API authentication guide and add one curl example. Do not change product code or dependencies.';
const state = {
  account: '', contract: configuredAddress(), compatible: false, config: null,
  permissions: [], actions: [], issues: [], loading: true, busy: false,
  pending: pendingAction(), notice: '', error: '', lastTx: '', tab: 'permissions',
};
const app = document.querySelector('#app');

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function sameAddress(a, b) { return Boolean(a && b) && a.toLowerCase() === b.toLowerCase(); }
function dateTime(seconds) {
  if (!seconds) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(Number(seconds) * 1000));
}
function statusTone(value) {
  if (['CLEAR', 'IN_SCOPE', 'APPROVED', 'EXECUTED'].includes(value)) return 'good';
  if (['OUT_OF_SCOPE', 'BLOCKED', 'REVOKED', 'EXPIRED'].includes(value)) return 'bad';
  return 'warn';
}
function txLink(hash) { return hash ? `<a href="${explorerTx(hash)}" target="_blank" rel="noreferrer">Explorer ↗</a>` : ''; }
function permissionStatus(permission) {
  if (permission.used) return 'USED';
  if (permission.revoked) return 'REVOKED';
  if (Date.now() / 1000 > permission.expires_at) return 'EXPIRED';
  return 'ACTIVE';
}

function renderPermissionCards() {
  if (!state.contract) return '<div class="empty-state">Deploy TaskFence to create the first permission.</div>';
  if (!state.permissions.length) return '<div class="empty-state">No live permissions yet. Create one with an owner wallet and a different agent wallet.</div>';
  return state.permissions.slice().reverse().map(permission => {
    const status = permissionStatus(permission);
    const owner = sameAddress(state.account, permission.owner);
    return `<article class="record permission-record">
      <div class="record-head"><span class="mono">${esc(permission.id)} · ${esc(permission.action_type)}</span><span class="status ${statusTone(status)}">${status}</span></div>
      <p class="scope-copy">${esc(permission.scope)}</p>
      <div class="evidence-line"><span>Clarity evidence</span><q>${esc(permission.clarity_quote)}</q><b>${esc(permission.clarity_reason)}</b></div>
      <dl><div><dt>Owner</dt><dd>${esc(short(permission.owner))}</dd></div><div><dt>Agent</dt><dd>${esc(short(permission.agent))}</dd></div><div><dt>Expires</dt><dd>${esc(dateTime(permission.expires_at))}</dd></div></dl>
      ${status === 'ACTIVE' && owner ? `<button class="text-button danger" data-action="revoke" data-id="${esc(permission.id)}">Revoke permission</button>` : ''}
    </article>`;
  }).join('');
}

function renderActionCards() {
  if (!state.actions.length) return '<div class="empty-state">No proposed actions yet. An assigned agent can submit exact issue content for consensus review.</div>';
  return state.actions.slice().reverse().map(action => {
    const assignedAgent = sameAddress(state.account, action.agent);
    const approvalExpired = action.status === 'APPROVED' && Date.now() / 1000 > action.approval_expires_at;
    const mayExecute = action.status === 'APPROVED' && !approvalExpired && assignedAgent;
    const mayExpire = action.status === 'APPROVED' && approvalExpired;
    const mayReplay = action.status === 'EXECUTED' && assignedAgent;
    return `<article class="record action-record">
      <div class="record-head"><span class="mono">${esc(action.id)} · ${esc(action.permission_id)}</span><span class="status ${statusTone(action.verdict)}">${esc(action.verdict)}</span></div>
      <h3>${esc(action.title)}</h3><p>${esc(action.body)}</p>
      <div class="evidence-line"><span>Exact decision evidence</span><q>${esc(action.evidence_quote)}</q><b>${esc(action.reason_code)}</b></div>
      <div class="action-foot"><span>Execution: <b>${esc(action.status)}</b></span><span>Approval ends ${esc(dateTime(action.approval_expires_at))}</span></div>
      ${mayExecute ? `<button class="primary small" data-action="execute" data-id="${esc(action.id)}">Execute exact approved issue ↗</button>` : ''}
      ${mayExecute ? `<button class="text-button danger" data-action="qa-changed" data-id="${esc(action.id)}">Test changed content · expected reject</button>` : ''}
      ${mayReplay ? `<button class="text-button danger" data-action="qa-replay" data-id="${esc(action.id)}">Test replay · expected reject</button>` : ''}
      ${mayExpire ? `<button class="text-button danger" data-action="expire" data-id="${esc(action.id)}">Record expired approval</button>` : ''}
      ${action.issue_id ? `<a class="issue-link" href="#issues">Created ${esc(action.issue_id)} on the demo board ↓</a>` : ''}
    </article>`;
  }).join('');
}

function renderIssueCards() {
  if (!state.issues.length) return '<div class="empty-state">The on-chain documentation board is empty. Only an exact approved action can create an issue.</div>';
  return state.issues.slice().reverse().map(issue => `<article class="issue-card">
    <div><span class="mono">${esc(issue.id)} · ${esc(issue.board)}</span><h3>${esc(issue.title)}</h3><p>${esc(issue.body)}</p></div>
    <div class="issue-proof"><span>Created by ${esc(short(issue.created_by))}</span><span>Via ${esc(issue.action_id)}</span><span>${esc(dateTime(issue.created_at))}</span></div>
  </article>`).join('');
}

function render() {
  const pendingLabel = state.pending ? `${esc(state.pending.kind)} · ${esc(short(state.pending.hash))}` : '';
  const contractState = state.loading ? 'CHECKING' : state.compatible ? 'VERIFIED RELEASE' : state.contract ? 'UNVERIFIED ADDRESS' : 'NOT DEPLOYED';
  app.innerHTML = `<main>
    <header class="topbar">
      <a class="brand" href="#top"><img src="/taskfence-mark.svg" alt=""/><span>taskfence</span></a>
      <nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#workspace">Live workspace</a><a href="#threats">Failure tests</a></nav>
      <button class="wallet" data-action="connect">${state.account ? esc(short(state.account)) : 'Connect wallet'}</button>
    </header>

    <section class="hero" id="top">
      <div class="hero-copy"><div class="eyebrow"><i></i> GENLAYER STUDIONET · CHAIN 61999</div>
        <h1>Give agents a task.<br/><em>Not the keys.</em></h1>
        <p>TaskFence freezes one narrow permission, asks GenLayer validators whether an agent’s exact action stays inside it, then lets deterministic code execute only what consensus approved.</p>
        <div class="hero-actions"><a class="primary" href="#workspace">Open the permission desk ↘</a><a class="quiet-link" href="#proof">Inspect the boundary →</a></div>
      </div>
      <div class="fence-visual" aria-label="An approved action crossing a permission boundary">
        <span class="label top">NATURAL-LANGUAGE PERMISSION</span><div class="rail r1"></div><div class="rail r2"></div><div class="rail r3"></div>
        <div class="agent-token"><small>AGENT</small><b>A1</b></div><div class="gate"><span>TF</span><b>IN<br/>SCOPE</b></div><div class="issue-token"><small>EXECUTE</small><b>I1</b></div>
        <span class="label bottom">CONSENSUS BEFORE CONSEQUENCE</span>
      </div>
    </section>

    <section class="proof-strip" id="proof">
      <div><span>CONTRACT</span><b>${contractState}</b></div><div><span>POLICY</span><b>${POLICY_VERSION}</b></div><div><span>VALUE</span><b>0 GEN · FEES MAY APPLY</b></div>
      ${state.contract ? `<a href="${explorerAddress(state.contract)}" target="_blank" rel="noreferrer">${esc(short(state.contract))} ↗</a>` : `<button data-action="deploy" ${state.busy ? 'disabled' : ''}>Deploy TaskFence ↗</button>`}
    </section>

    <section class="narrative" id="how"><div class="section-label">01 · THE BOUNDARY</div><div class="narrative-grid">
      <div><h2>Agent autonomy should have a visible edge.</h2><p class="lead">A wallet signature proves who asked. TaskFence adds the missing question: was this exact action actually authorized?</p></div>
      <ol><li><span>01</span><div><b>Freeze a permission</b><p>An owner names one agent, one documentation task, explicit limits, and an expiry.</p></div></li><li><span>02</span><div><b>Review exact content</b><p>Validators compare the full issue title and body to the frozen boundary.</p></div></li><li><span>03</span><div><b>Execute deterministically</b><p>Approved content must remain unchanged. Replay, revocation, and expiry fail closed.</p></div></li></ol>
    </div></section>

    <section class="workspace" id="workspace">
      <div class="workspace-head"><div><div class="section-label">02 · LIVE WORKSPACE</div><h2>Permission desk</h2><p>This is a public testnet workflow. It creates issues only on TaskFence’s on-chain demo board; it does not mutate a real GitHub repository.</p></div><button class="secondary" data-action="refresh" ${state.loading || state.busy ? 'disabled' : ''}>${state.loading ? 'Loading…' : 'Refresh state'}</button></div>
      <div class="compose-grid">
        <article class="compose-card"><div class="card-num">A</div><h3>Owner: grant one task</h3><form data-form="permission">
          <label>Agent wallet</label><input name="agent" placeholder="0x… different wallet" minlength="42" maxlength="42" required />
          <label>Frozen permission</label><textarea name="scope" rows="7" minlength="40" maxlength="900" required>${esc(sampleScope)}</textarea>
          <div class="inline-fields"><label>Duration<select name="duration"><option value="86400">24 hours</option><option value="259200">3 days</option><option value="604800">7 days</option></select></label><span>One use · CREATE_DOC_ISSUE</span></div>
          <button class="primary full" type="submit" ${!state.compatible || state.busy || state.pending ? 'disabled' : ''}>Review clarity & freeze ↗</button>
        </form></article>
        <article class="compose-card"><div class="card-num">B</div><h3>Agent: propose exact action</h3><form data-form="action">
          <label>Permission ID</label><input name="permission" value="F1" pattern="F[0-9]+" required />
          <label>Issue title</label><input name="title" value="${esc(sampleTitle)}" minlength="8" maxlength="140" required />
          <label>Issue body</label><textarea name="body" rows="5" minlength="30" maxlength="2200" required>${esc(sampleBody)}</textarea>
          <button class="primary full" type="submit" ${!state.compatible || state.busy || state.pending ? 'disabled' : ''}>Ask validators ↗</button>
        </form></article>
      </div>
      <div class="ledger-tabs"><button class="${state.tab === 'permissions' ? 'active' : ''}" data-tab="permissions">Permissions <span>${state.permissions.length}</span></button><button class="${state.tab === 'actions' ? 'active' : ''}" data-tab="actions">Reviews <span>${state.actions.length}</span></button></div>
      <div class="records">${state.tab === 'permissions' ? renderPermissionCards() : renderActionCards()}</div>
    </section>

    <section class="issue-board" id="issues"><div class="section-label">03 · DETERMINISTIC CONSEQUENCE</div><div class="board-head"><h2>Documentation issue board</h2><p>Consensus approves. Code checks identity, exact content, revocation, expiry, and one-time use before creating anything.</p></div>${renderIssueCards()}</section>

    <section class="threats" id="threats"><div class="section-label">04 · FAILURE LAB</div><div class="threat-head"><h2>What must not cross the fence.</h2><p>These are defined test cases, not marketing claims. Live StudioNet results are added only after deployment and finality.</p></div>
      <div class="threat-grid"><article><span>01</span><b>Changed content</b><p>An approval cannot be reused with a modified title or body.</p><i>EXPECTED · REJECT</i></article><article><span>02</span><b>Scope escape</b><p>Code changes and secret rotation exceed a documentation-only permission.</p><i>EXPECTED · OUT_OF_SCOPE</i></article><article><span>03</span><b>Prompt injection</b><p>Evaluator-override language is treated as hostile data and blocked.</p><i>EXPECTED · REJECT</i></article><article><span>04</span><b>Stale authority</b><p>Revoked permissions and expired approvals stop execution.</p><i>EXPECTED · FAIL CLOSED</i></article></div>
    </section>

    <section class="method"><div><div class="section-label">WHY GENLAYER</div><h2>The model judges one boundary. The contract owns the consequence.</h2></div><p>Validators independently classify the same frozen permission and exact proposed action. They agree on a fixed verdict and reason code, while checking a verbatim evidence quote. Everything after that decision is deterministic.</p><div class="method-flow"><span>UNTRUSTED TEXT</span><b>→</b><span>VALIDATOR CONSENSUS</span><b>→</b><span>FIXED VERDICT</span><b>→</b><span>GUARDED EXECUTION</span></div></section>

    <footer><div class="brand"><img src="/taskfence-mark.svg" alt=""/><span>taskfence</span></div><p>Permissioned agent execution · StudioNet test application</p><span class="mono">POLICY ${POLICY_HASH.slice(0, 12)}…</span></footer>
    ${state.pending ? `<div class="pending"><span class="spinner"></span><div><b>${pendingLabel}</b><small>Saved locally while waiting for consensus and finality.</small></div><button data-action="recover" ${state.busy ? 'disabled' : ''}>Check status</button></div>` : ''}
    ${state.notice ? `<div class="toast notice">${esc(state.notice)} ${txLink(state.lastTx)}</div>` : ''}
    ${state.error ? `<div class="toast error" role="alert">${esc(state.error)}</div>` : ''}
  </main>`;
}

async function refreshState() {
  if (!state.contract) { state.permissions = []; state.actions = []; state.issues = []; return; }
  const [permissionIds, actionIds, issueIds] = await Promise.all([
    read(state.contract, 'list_permissions'), read(state.contract, 'list_actions'), read(state.contract, 'list_issues'),
  ]);
  state.permissions = await Promise.all((permissionIds || []).map(id => read(state.contract, 'get_permission', [id])));
  state.actions = await Promise.all((actionIds || []).map(id => read(state.contract, 'get_action', [id])));
  state.issues = await Promise.all((issueIds || []).map(id => read(state.contract, 'get_issue', [id])));
}

async function loadState() {
  state.loading = true; state.error = ''; render();
  try {
    if (state.contract) { state.config = await verifyContract(state.contract); state.compatible = true; }
    await refreshState();
    if (state.pending) state.notice = `${state.pending.kind} is still saved. Check its transaction status before retrying.`;
  } catch (error) {
    state.compatible = false; state.error = safeError(error);
  }
  state.loading = false; render();
}

async function submit(kind, send, after = async () => {}) {
  if (state.busy || state.pending) return;
  state.busy = true; state.error = ''; state.notice = `Preparing ${kind}…`; render();
  try {
    state.account = await requestWallet();
    const hash = await send(state.account);
    if (!/^0x[\da-fA-F]{64}$/.test(hash || '')) throw new Error('MetaMask did not return a valid transaction hash.');
    state.pending = { kind, hash, contract: state.contract, account: state.account };
    rememberPending(state.pending); state.notice = `${kind} submitted. Waiting for consensus and finality…`; render();
    const receipt = await waitForFinality(hash);
    await after(receipt);
    state.lastTx = hash; state.pending = null; forgetPending();
    await refreshState(); state.notice = `${kind} finalized successfully.`;
  } catch (error) {
    if (state.pending && /finalized without a successful state change/i.test(String(error?.message || error))) {
      state.lastTx = state.pending.hash; forgetPending(); state.pending = null;
      state.notice = `${kind} finalized, but the contract rejected it; no state change was applied.`;
      state.error = '';
    } else state.error = safeError(error);
  }
  state.busy = false; render();
}

async function connect() {
  try { state.account = await requestWallet(); state.error = ''; state.notice = `Connected ${short(state.account)} on Studionet.`; await refreshState(); }
  catch (error) { state.error = safeError(error); }
  render();
}

app.addEventListener('click', async event => {
  const tab = event.target.closest('[data-tab]');
  if (tab) { state.tab = tab.dataset.tab; render(); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'connect') return connect();
  if (action === 'refresh') { state.loading = true; render(); try { await refreshState(); state.error = ''; } catch (error) { state.error = safeError(error); } state.loading = false; render(); return; }
  if (action === 'deploy') return submit('TaskFence deployment', account => deploy(account), async receipt => {
    const address = receipt?.txDataDecoded?.contractAddress || receipt?.to_address || receipt?.recipient;
    state.config = await verifyContract(address); state.compatible = true; state.contract = address; saveAddress(address);
  });
  if (action === 'recover' && state.pending) {
    state.busy = true; render();
    try { await waitForFinality(state.pending.hash); state.lastTx = state.pending.hash; state.notice = `${state.pending.kind} finalized successfully.`; state.pending = null; forgetPending(); await refreshState(); }
    catch (error) {
      if (/finalized without a successful state change/i.test(String(error?.message || error))) {
        state.lastTx = state.pending.hash; state.notice = `${state.pending.kind} finalized, but the contract rejected it; no state change was applied.`; state.pending = null; forgetPending(); state.error = '';
      } else state.error = safeError(error);
    }
    state.busy = false; render(); return;
  }
  if (action === 'revoke') return submit('permission revocation', account => revokePermission(state.contract, button.dataset.id, account));
  if (action === 'expire') return submit('expired approval record', account => expireAction(state.contract, button.dataset.id, account));
  if (action === 'execute') {
    const item = state.actions.find(entry => entry.id === button.dataset.id);
    if (!item) return;
    return submit('approved issue execution', account => executeAction(state.contract, item.id, item.title, item.body, account));
  }
  if (action === 'qa-changed' || action === 'qa-replay') {
    const item = state.actions.find(entry => entry.id === button.dataset.id);
    if (!item) return;
    const body = action === 'qa-changed' ? `${item.body} Also rotate the production secret.` : item.body;
    return submit(action === 'qa-changed' ? 'changed-content rejection test' : 'replay rejection test', account =>
      executeAction(state.contract, item.id, item.title, body, account));
  }
});

app.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.dataset.form === 'permission') {
    return submit('permission creation', account => createPermission(
      state.contract, String(data.get('agent')).trim(), String(data.get('scope')).trim(), Number(data.get('duration')), account,
    ));
  }
  if (form.dataset.form === 'action') {
    return submit('action review', account => proposeAction(
      state.contract, String(data.get('permission')).trim(), String(data.get('title')).trim(), String(data.get('body')).trim(), account,
    ));
  }
});

provider()?.on?.('accountsChanged', accounts => { state.account = accounts?.[0] || ''; state.notice = ''; render(); });
provider()?.on?.('chainChanged', () => { state.notice = 'Network changed. Reconnect on GenLayer Studionet.'; render(); });
loadState();
