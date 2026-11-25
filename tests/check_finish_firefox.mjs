import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {checkWorkoutFinishFlow} from './workout_finish_flow.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(project, '.test-artifacts');
await mkdir(artifacts, {recursive:true});
const profile = await mkdtemp(resolve(artifacts, 'firefox-'));
const pageURL = process.env.FITCAMP_TEST_URL ?? pathToFileURL(resolve(project, 'docs', 'index.html')).href;
const firefox = process.env.FIREFOX_BIN ?? (process.platform === 'win32'
  ? 'C:/Program Files/Mozilla Firefox/firefox.exe' : 'firefox');
const browser = spawn(firefox, [
  '-headless', '-no-remote', '-profile', profile, '--remote-debugging-port', '0', 'about:blank',
], {windowsHide:true, stdio:['ignore','pipe','pipe']});
let startup = '';
let launchError;
let socket;
for (const stream of [browser.stdout, browser.stderr]) {
  stream.on('data', chunk => { startup += chunk; });
}
browser.on('error', error => { launchError = error; });

function decode(value) {
  if (value.type === 'null') return null;
  if (value.type === 'array') return value.value.map(decode);
  if (value.type === 'object') return Object.fromEntries(value.value.map(([key, item]) => [key, decode(item)]));
  return value.value;
}

try {
  let endpoint;
  for (let attempt = 0; attempt < 100 && !endpoint && !launchError; attempt++) {
    endpoint = startup.match(/WebDriver BiDi listening on (ws:\/\/127\.0\.0\.1:\d+)/)?.[1];
    if (!endpoint) await delay(100);
  }
  assert.ok(endpoint, 'Firefox did not expose WebDriver BiDi. ' + (launchError?.message ?? startup));
  socket = new WebSocket(endpoint + '/session');
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, {once:true});
    socket.addEventListener('error', fail, {once:true});
  });
  const pending = new Map();
  const errors = [];
  let commandId = 0;
  socket.addEventListener('message', ({data}) => {
    const response = JSON.parse(data);
    if (response.method === 'log.entryAdded' && response.params.type === 'javascript' && response.params.level === 'error') {
      errors.push(response.params.text ?? 'JavaScript error');
    }
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.type === 'error') request.reject(new Error(response.error + ': ' + response.message));
    else request.resolve(response.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++commandId, {resolve, reject});
    socket.send(JSON.stringify({id:commandId, method, params}));
  });
  await command('session.new', {capabilities:{alwaysMatch:{}}});
  await command('session.subscribe', {events:['log.entryAdded']});
  const {contexts} = await command('browsingContext.getTree');
  const context = contexts[0].context;
  await command('browsingContext.setViewport', {context, viewport:{width:390, height:820}});
  await command('script.addPreloadScript', {functionDeclaration:`() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.cspViolations.push(event.effectiveDirective + ' · ' + event.blockedURI);
    });
  }`});
  const inspect = async expression => {
    const evaluated = await command('script.evaluate', {target:{context}, expression, awaitPromise:true,
      serializationOptions:{maxObjectDepth:8}});
    if (evaluated.type === 'exception') throw new Error(evaluated.exceptionDetails.text);
    return decode(evaluated.result);
  };
  const waitFor = async (expression, description) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await inspect(expression)) return;
      await delay(50);
    }
    assert.fail(description);
  };
  const clickUI = async selector => {
    const point = await inspect(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element?.getClientRects().length || element.disabled) return null;
      element.scrollIntoView({block:'center'});
      const {x, y, width, height} = element.getBoundingClientRect();
      const point = {x:Math.floor(x + width / 2), y:Math.floor(y + height / 2)};
      return element.contains(document.elementFromPoint(point.x, point.y)) ? point : null;
    })()`);
    assert.ok(point, 'Control is unavailable to a real click: ' + selector);
    await command('input.performActions', {context, actions:[{type:'pointer', id:'mouse',
      parameters:{pointerType:'mouse'}, actions:[
        {type:'pointerMove', origin:'viewport', ...point},
        {type:'pointerDown', button:0},
        {type:'pointerUp', button:0},
      ]}]});
  };
  const assertCleanPage = async () => {
    assert.deepEqual(errors, [], 'Uncaught Firefox errors');
    assert.deepEqual(await inspect('window.cspViolations'), [], 'Firefox Content Security Policy violations');
  };
  await command('browsingContext.navigate', {context, url:pageURL, wait:'complete'});
  await waitFor('document.body.classList.contains("app-ready")', 'Application did not open');
  await checkWorkoutFinishFlow({inspect, clickUI, waitFor, assertCleanPage,
    reload:() => command('browsingContext.reload', {context, wait:'complete'})});
  console.log('Firefox: workout finish, invalid drafts, explicit discard, and planned workout passed.');
  await command('session.end');
} finally {
  socket?.close();
  browser.kill();
}
