// Minimal CDP client for the Pixel's WebView, over an adb-forwarded socket.
// Usage: node cdp.mjs <file-with-js-expression>
//   The file's contents are evaluated in the page and the result printed as JSON.
import { readFileSync } from 'node:fs';

const PORT = process.env.CDP_PORT || 9222;

async function listTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

const expr = readFileSync(process.argv[2], 'utf8');

const targets = (await listTargets()).filter(t => t.type === 'page');
if (!targets.length) {
  console.error('no page targets; is the app running and forwarded?');
  process.exit(1);
}
const target = targets.find(t => (t.url || '').includes('localhost')) || targets[0];

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();

function send(method, params) {
  const msgId = ++id;
  ws.send(JSON.stringify({ id: msgId, method, params }));
  return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
}

ws.addEventListener('message', ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id).resolve(msg);
    pending.delete(msg.id);
  }
});

ws.addEventListener('error', e => { console.error('ws error', e.message || e); process.exit(1); });

await new Promise(r => ws.addEventListener('open', r));

const out = await send('Runtime.evaluate', {
  expression: expr,
  returnByValue: true,
  awaitPromise: true,
  allowUnsafeEvalBlockedByCSP: true,
});

if (out.result?.exceptionDetails) {
  console.error('PAGE EXCEPTION:', JSON.stringify(out.result.exceptionDetails.exception?.description || out.result.exceptionDetails, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(out.result?.result?.value, null, 2));
ws.close();
process.exit(0);
