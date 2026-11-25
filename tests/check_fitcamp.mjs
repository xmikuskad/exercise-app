import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir, mkdtemp, readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {checkWorkoutFinishFlow} from './workout_finish_flow.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const artifacts = resolve(project, '.test-artifacts');
await mkdir(artifacts, {recursive:true});
const profile = await mkdtemp(resolve(artifacts, 'chrome-'));
const pageURL = process.env.FITCAMP_TEST_URL ?? pathToFileURL(resolve(project, 'docs', 'index.html')).href;
const chrome = process.env.CHROME_BIN ?? (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : 'chromium');
const browser = spawn(chrome, [
  '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-crashpad-for-testing', '--disable-breakpad', '--noerrdialogs',
  '--disable-background-networking', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, 'about:blank',
], {windowsHide:true, stdio:['ignore', 'ignore', 'pipe']});
let browserError = '';
browser.stderr.on('data', data => { browserError += data; });
let ws;
try {
  let config;
  for (let i = 0; i < 80 && !config; i++) {
    try { config = await readFile(resolve(profile, 'DevToolsActivePort'), 'utf8'); }
    catch { await delay(100); }
  }
  assert.ok(config, 'Chrome did not expose DevTools. ' + browserError);
  const targets = await fetch('http://127.0.0.1:' + config.split('\n')[0] + '/json/list').then(r => r.json());
  ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    ws.addEventListener('open', done, {once:true});
    ws.addEventListener('error', fail, {once:true});
  });
  let id = 0;
  const pending = new Map();
  const pageErrors = [];
  ws.addEventListener('message', ({data}) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      pageErrors.push(details.exception?.description ?? details.text);
    }
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(message.error);
    else handler.resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, {resolve, reject});
    ws.send(JSON.stringify({id, method, params}));
  });
  const inspect = async (expression) => {
    const evaluated = await command('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
    if (evaluated.exceptionDetails) throw new Error(evaluated.result.description || evaluated.exceptionDetails.text);
    return evaluated.result.value;
  };
  const viewport = (width) => command('Emulation.setDeviceMetricsOverride',
    {width, height:820, deviceScaleFactor:1, mobile:true});
  const screenshot = async (file) => {
    const image = await command('Page.captureScreenshot', {format:'png', fromSurface:true});
    await writeFile(resolve(artifacts, file), Buffer.from(image.data, 'base64'));
  };

  await viewport(390);
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Page.addScriptToEvaluateOnNewDocument', {source:`
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.cspViolations.push(event.effectiveDirective + ' · ' + event.blockedURI);
    });
  `});
  if (pageURL.startsWith('file:')) {
    await command('Network.emulateNetworkConditions',
      {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0});
  }
  await command('Page.navigate', {url:pageURL});
  for (let i = 0; i < 60 && !await inspect('document.body?.classList.contains("app-ready")'); i++)
    await delay(100);
  const clickUI = async selector => {
    const point = await inspect(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element?.getClientRects().length || element.disabled) return null;
      element.scrollIntoView({block:'center'});
      const {x, y, width, height} = element.getBoundingClientRect();
      const point = {x:x + width / 2, y:y + height / 2};
      return element.contains(document.elementFromPoint(point.x, point.y)) ? point : null;
    })()`);
    assert.ok(point, 'Control is unavailable to a real click: ' + selector);
    await command('Input.dispatchMouseEvent', {...point, type:'mousePressed', button:'left', clickCount:1});
    await command('Input.dispatchMouseEvent', {...point, type:'mouseReleased', button:'left', clickCount:1});
  };
  const waitFor = async (expression, description) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await inspect(expression)) return;
      await delay(40);
    }
    assert.fail(description);
  };
  const assertCleanPage = async () => {
    assert.deepEqual(pageErrors, [], 'Uncaught application errors');
    assert.deepEqual(await inspect('window.cspViolations'), [], 'Content Security Policy violations');
  };
  const checkFinish = () => checkWorkoutFinishFlow({inspect, clickUI, waitFor,
    reload:() => command('Page.reload'), assertCleanPage});
  suite: {
  if (process.argv.includes('--finish-only')) {
    await checkFinish();
    console.log('Chrome: workout finish, invalid drafts, explicit discard, and planned workout passed.');
    break suite;
  }
  const rendered = await inspect(`(async () => {
    await Promise.all(Array.from(document.images, image => { image.loading = 'eager'; return image.decode(); }));
    return {
      images: document.images.length,
      landscapeOverflow: document.documentElement.scrollWidth > innerWidth,
      missingTargets: [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.querySelector(a.hash)).length,
      sources: performance.getEntriesByType('resource').filter(r => !r.name.startsWith('data:')).length
    };
  })()`);
  assert.deepEqual(rendered, {images:105, landscapeOverflow:false, missingTargets:0, sources:0});
  assert.equal(await inspect(`[...document.querySelectorAll('.card')].every(card =>
    card.querySelector('.exercise-name .english-name[lang=en]').textContent.startsWith('(') &&
    card.querySelector('.exercise-name .english-name[lang=en]').textContent.endsWith(')') &&
    card.querySelectorAll('.checkpoints li').length === 3)`), true);
  await screenshot('fitcamp-mobile.png');
  await inspect('location.hash = "#press"');
  await delay(250);
  assert.equal(await inspect('location.hash === "#press" && document.querySelector("#press").open'), true);
  assert.equal(await inspect(`(() => {
    const card = document.querySelector('#press');
    const action = card.querySelector('.start-exercise').getBoundingClientRect();
    const formWidth = card.querySelector('.exercise-commands').getBoundingClientRect().width;
    const demo = card.querySelector('.demo-toggle').getBoundingClientRect();
    const source = card.querySelector('.demo-source').getBoundingClientRect();
    return action.height >= 48 && Math.abs(action.width - formWidth) < 1 &&
      demo.height >= 48 && Math.abs(demo.height - source.height) < 1 && Math.abs(demo.width - source.width) < 1;
  })()`), true);
  await screenshot('fitcamp-exercise.png');
  await inspect(`document.querySelector('#press .checkpoints').scrollIntoView({block:'start'})`);
  await screenshot('fitcamp-checkpoints.png');
  assert.equal(await inspect(`[...document.querySelectorAll('video')].every(video =>
    !video.hasAttribute('src') && video.dataset.src.startsWith('data:video/mp4;base64,'))`), true);
  assert.equal(await inspect(`document.querySelectorAll('.demo-source[href^="https://"]').length`), 53);
  assert.equal(await inspect(`document.querySelectorAll('.card .priority').length`), 52);
  assert.equal(await inspect(`document.querySelectorAll('.card .muscle-map img').length`), 52);
  assert.equal(await inspect(`document.querySelector('#history-results').hidden`), true);
  assert.equal(await inspect(`document.querySelectorAll('.category').length`), 9);
  assert.equal(await inspect(`[...document.querySelectorAll('.category')].every(group => group.querySelector('.base'))`), true);
  assert.equal(await inspect(`document.querySelector('#biceps .priority').textContent`), 'Základ');
  assert.equal(await inspect(`document.querySelector('#sideplank .demo-source').href.includes('knee-side-plank')`), true);
  assert.equal(await inspect(`[...document.querySelectorAll('.category')].every(group => {
    const rank = {base:0, alternative:1, accessory:2};
    const priorities = [...group.querySelectorAll('.priority')].map(badge => rank[badge.classList[1]]);
    return priorities.every((value, i) => i === 0 || value >= priorities[i-1]);
  })`), true);
  await inspect(`document.querySelector('#press .exercise-demo').scrollIntoView({block:'start'})`);
  await inspect(`document.querySelector('#press .demo-toggle').click()`);
  for (let i = 0; i < 60 && !await inspect(`document.querySelector('#press video').currentTime > 0.25`); i++) await delay(100);
  assert.equal(await inspect(`document.querySelector('#press video').currentTime > 0.25`), true);
  assert.equal(await inspect(`!document.getElementById('press-video').hidden &&
    document.querySelector('#press .demo-stills').hidden`), true);
  await screenshot('fitcamp-playing.png');
  await inspect(`document.querySelector('#press .demo-toggle').click()`);
  assert.equal(await inspect(`document.querySelector('#press video').paused &&
    document.getElementById('press-video').hidden`), true);
  const clipTest = await inspect(`(async () => {
    const clips = Array.from(document.querySelectorAll('video'));
    const results = [];
    for (const clip of clips) {
      const clipId = clip.closest('figure').id;
      const player = document.createElement('video');
      player.preload = 'metadata';
      results.push(await new Promise(resolve => {
        const timeout = setTimeout(() => resolve({ok:false, clip:clipId}), 2500);
        const finish = ok => { clearTimeout(timeout); resolve({ok, clip:clipId}); };
        player.onloadedmetadata = () => {
          if (player.duration < 4 || player.duration > 5.1 ||
              player.videoWidth !== 432 || player.videoHeight !== 264) {
            finish(false);
            return;
          }
          player.currentTime = 1.6;
        };
        player.onseeked = () => finish(player.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
        player.onerror = () => finish(false);
        player.src = clip.dataset.src;
      }));
      player.removeAttribute('src');
      player.load();
    }
    return results;
  })()`);
  assert.equal(clipTest.length, 53);
  assert.deepEqual(clipTest.filter(clip => !clip.ok), []);
  await inspect(`document.querySelector("#press a[href='#sit']").click()`);
  await delay(250);
  assert.equal(await inspect('location.hash === "#sit" && document.querySelector("#sit").open'), true);
  await inspect(`document.querySelector('#sit .exercise-note').value = '2 × 10';
    document.querySelector('#sit .track .save').click();`);
  assert.equal(await inspect(`document.querySelector('#sit .last').textContent.includes('2 × 10')`), true);
  assert.equal(await inspect(`document.querySelector('#recent-items a').hash`), '#sit');

  await command('Page.reload');
  for (let i = 0; i < 60 && !await inspect(`document.querySelector('#sit .last')?.textContent.includes('2 × 10')`); i++)
    await delay(100);
  assert.equal(await inspect(`document.querySelector('#sit .last').textContent.includes('2 × 10')`), true);
  const defaultDate = await inspect(`document.querySelector('#training-date').value`);
  await inspect(`document.querySelector('#sit .edit').click();
    document.querySelector('#sit .edit-date input').value = '2025-10-13';
    document.querySelector('#sit .exercise-note').value = '3 × 8';
    document.querySelector('#sit .track .save').click();`);
  assert.equal(await inspect(`document.querySelector('#recent-items time').dateTime`), '2025-10-13');
  assert.equal(await inspect(`document.querySelector('#training-date').value`), defaultDate);

  await inspect(`const testSearch = document.querySelector('#exercise-search');
    testSearch.value = 'lytka'; testSearch.dispatchEvent(new Event('input'));`);
  assert.equal(await inspect(`document.querySelectorAll('.card:not([hidden])').length`), 4);
  await inspect(`testSearch.value = 'low row'; testSearch.dispatchEvent(new Event('input'))`);
  assert.equal(await inspect(`document.querySelectorAll('.card:not([hidden])').length`), 1);
  assert.equal(await inspect(`document.querySelector('.card:not([hidden])').id`), 'row');
  await inspect(`document.querySelector('#recent-items a').click()`);
  assert.equal(await inspect(`document.querySelectorAll('.card:not([hidden])').length`), 52);

  const pressButton = (id, button) =>
    inspect(`document.querySelector('#${id} .${button}').click()`);
  const alertOpen = () => inspect(`document.querySelector('#overlap-warning').open`);
  const activeExercise = () => inspect(`document.querySelector('#workout-active')?.hidden === false
    ? document.querySelector('#workout-active-link')?.hash.slice(1) : null`);
  const countBlocks = () => inspect(`document.querySelectorAll('#workout-exercises li').length`);
  const complete = async (id) => {
    await pressButton(id, 'start-exercise');
    assert.equal(await alertOpen(), false, id + ' warned too early');
    assert.equal(await activeExercise(), id);
    await inspect(`document.querySelector('#finish-running').click()`);
    assert.equal(await activeExercise(), null);
  };
  const enterSet = (row, amount, weight = '', side = 'both') => inspect(`
    (() => {
      const set = document.querySelectorAll('.set-sheet-group')[${row}];
      const repInput = set.querySelector('.set-row-amount');
      repInput.value = ${JSON.stringify(amount)};
      set.querySelector('.set-row-weight').value = ${JSON.stringify(weight)};
      const sideInput = set.querySelector('.set-side-select');
      if (sideInput) sideInput.value = ${JSON.stringify(side)};
      repInput.dispatchEvent(new Event('input', {bubbles:true}));
    })()
  `);
  await inspect(`location.hash = 'teraz'`);
  await delay(80);
  assert.equal(await inspect(`!document.querySelector('#workout-start-panel').hidden && document.querySelector('#live-map-dock').hidden`), true);
  await inspect(`document.querySelector('#start-free-workout').click()`);
  assert.equal(await inspect(`!activeWorkout.plan && !document.querySelector('#live-map-dock').hidden`), true);
  await inspect(`document.querySelector('#workout-pick').value = 'chest'; document.querySelector('#start-picked').click()`);
  await pressButton('row', 'start-exercise');
  assert.equal(await activeExercise(), 'chest');
  assert.equal(await inspect(`document.querySelector('#coverage-status').textContent.includes('0 priamo')`), true);
  assert.equal(await inspect(`!document.querySelector('#coverage-preview-key').hidden`), true);
  await inspect(`document.querySelector('#live-map-dock').click()`);
  assert.equal(await inspect(`document.querySelector('#coverage-dialog').open &&
    document.querySelector('#live-map-view').closest('#coverage-dialog') !== null`), true);
  await inspect(`(() => {
    const canvas = document.querySelector('#coverage-canvas');
    const bounds = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click', {clientX:bounds.left + bounds.width * 150/480,
      clientY:bounds.top + bounds.height * 333/420}));
  })()`);
  assert.equal(await inspect(`document.querySelector('#live-map-view .muscle-picker select').value`), 'tibant');
  assert.equal(await inspect(`Boolean(document.querySelector('#live-map-view .muscle-picker a[href="#toeraise"]'))`), true);
  await screenshot('fitcamp-coverage-pending.png');
  await inspect(`document.querySelector('#coverage-dialog button').click()`);
  await delay(120);
  assert.equal(await inspect(`document.querySelector('#live-map-view').parentElement.id`), 'live-map-host');
  assert.equal(await inspect(`document.querySelector('#record-set').closest('.card').id`), 'chest');
  await pressButton('chest', 'log-set-link');
  await delay(150);
  assert.equal(await inspect(`location.hash`), '#chest-log');
  assert.equal(await inspect(`document.querySelectorAll('.set-sheet-group').length`), 3);
  await enterSet(0, '10', '27,5');
  await enterSet(1, '8', '30');
  await command('Page.reload');
  for (let i = 0; i < 60 && await activeExercise() !== 'chest'; i++) await delay(100);
  assert.equal(await activeExercise(), 'chest', 'exercise running before reload should remain active');
  assert.equal(await inspect(`document.querySelector('.set-row-weight').value`), '27,5');
  await enterSet(0, '11', '27,5');
  await inspect(`document.querySelector('#inline-set-panel').scrollIntoView({block:'start'})`);
  await screenshot('fitcamp-sets.png');
  await inspect(`document.querySelector('#finish-running').click()`);
  assert.equal(await inspect(`document.querySelector('#record-set').closest('#set-panel-parking')?.hidden`), true);
  assert.equal(await inspect(`document.querySelector('#chest .set-log-result').hidden`), false);
  assert.equal(await countBlocks(), 1);
  assert.equal(await inspect(`document.querySelector('#coverage-status').textContent.includes('1 priamo · 2 len pomocne') &&
    document.querySelector('#coverage-preview-key').hidden`), true);
  assert.equal(await inspect(`document.querySelector('#coverage-parts a[href="#pushes"]').dataset.state === 'main' &&
    document.querySelector('#coverage-parts a[href="#triceps-group"]').dataset.state === 'secondary' &&
    document.querySelector('#coverage-parts a[href="#calves"]').dataset.state === 'none'`), true);
  assert.equal(await inspect(`document.querySelector('#coverage-missing-list').textContent.includes('Široký sval chrbta')`), true);
  await inspect(`document.querySelector('#live-map-dock').click()`);
  await screenshot('fitcamp-coverage-trained.png');
  await inspect(`document.querySelector('#coverage-dialog').close()`);
  await delay(120);
  await complete('push');
  await inspect(`location.hash = '#dbpress'`);
  await delay(100);
  await pressButton('dbpress', 'start-exercise');
  assert.equal(await alertOpen(), true);
  assert.equal(await activeExercise(), null);
  assert.equal(await inspect(`document.getElementById('overlap-list').textContent.includes('Veľký prsný sval')`), true);
  await screenshot('fitcamp-warning.png');
  await inspect(`document.querySelector('#overlap-warning button[value=back]').click()`);
  await delay(80);
  assert.equal(await activeExercise(), null);
  assert.equal(await countBlocks(), 2);
  await pressButton('dbpress', 'start-exercise');
  await inspect(`document.querySelector('#overlap-warning button[value=continue]').click()`);
  await delay(80);
  assert.equal(await activeExercise(), 'dbpress');
  await pressButton('dbpress', 'discard-exercise');
  assert.equal(await countBlocks(), 2);
  await complete('row');
  await complete('lat');
  await complete('biceps');
  assert.equal(await countBlocks(), 5);
  assert.equal(await inspect(`[...document.querySelectorAll('.muscle-line')].some(row =>
    row.querySelector('strong').textContent === 'Biceps' &&
    row.querySelector('span').textContent === '1× hlavné · 2× pomocné')`), true);
  await inspect(`document.querySelector('#finish-workout').click()`);
  assert.equal(await inspect(`document.querySelectorAll('#workout-archive option').length`), 1);
  await pressButton('dbpress', 'start-exercise');
  assert.equal(await alertOpen(), false);
  await enterSet(0, '10', '7,5');
  await inspect(`document.querySelector('#finish-running').click()`);
  assert.equal(await countBlocks(), 1, 'new session should start at zero');
  await pressButton('deadbug', 'start-exercise');
  await enterSet(0, '6', '', 'left');
  await enterSet(1, '6', '', 'right');
  await inspect(`document.querySelector('#finish-running').click()`);
  await pressButton('plank', 'start-exercise');
  assert.equal(await inspect(`document.querySelector('#set-amount-label').textContent`), 'Výdrž (sekundy)');
  await enterSet(0, '20');
  await inspect(`document.querySelector('#finish-running').click()`);
  await inspect(`document.querySelector('#finish-workout').click()`);

  const downloadPath = resolve(profile, 'downloads');
  await mkdir(downloadPath);
  await command('Page.setDownloadBehavior', {behavior:'allow', downloadPath});
  await inspect(`document.querySelector('#export-sets').click()`);
  await inspect(`document.querySelector('#export-log').click()`);
  let downloaded;
  for (let i = 0; i < 60 && !downloaded; i++) {
    downloaded = (await readdir(downloadPath)).find(name => name.endsWith('.json'));
    if (!downloaded) await delay(100);
  }
  assert.ok(downloaded, 'Missing exported backup');
  const exported = JSON.parse(await readFile(resolve(downloadPath, downloaded), 'utf8'));
  assert.equal(exported.entries.sit.note, '3 × 8');
  assert.equal(exported.workouts.length, 2);
  assert.equal(exported.workouts.find(w => w.exercises.length === 5).exercises[0].exercise, 'chest');
  assert.deepEqual(exported.workouts.find(w => w.exercises.length === 5).exercises[0].sets,
    [{amount:11, weight:27.5, side:null}, {amount:8, weight:30, side:null}]);
  let csvName;
  for (let i = 0; i < 60 && !csvName; i++) {
    csvName = (await readdir(downloadPath)).find(name => name.endsWith('.csv'));
    if (!csvName) await delay(100);
  }
  assert.ok(csvName, 'Missing exported CSV');
  const [csvHeader, ...csvRecords] = (await readFile(resolve(downloadPath, csvName), 'utf8')).trim().split('\r\n');
  const columns = csvHeader.split(',');
  const csvRows = csvRecords.map(line => Object.fromEntries(line.split(',').map((value, i) => [columns[i], value])));
  assert.equal(csvRows.length, 6);
  assert.ok(csvRows.some(row => row.exercise_id === 'dbpress' && row.weight_kg === '7.5' && row.weight_basis === 'per_dumbbell'));
  assert.ok(csvRows.some(row => row.exercise_id === 'plank' && row.hold_seconds === '20' && row.reps === ''));
  assert.ok(csvRows.some(row => row.exercise_id === 'deadbug' && row.reps === '6' && row.side === 'left'));
  const importPath = resolve(profile, 'import.json');
  await writeFile(importPath, JSON.stringify({version:1, entries:{
    sit:{date:'2025-10-01', note:'Older', savedAt:2},
    abduction:{date:'2025-10-16', note:'28 kg', savedAt:3},
  }, workouts:[{id:'backup-session', startedAt:1750000000000, finishedAt:1750001000000,
    exercises:[{exercise:'abduction', startedAt:1750000100000, finishedAt:1750000200000}]}],
  plans:[{id:'import-plan',name:'Importovaný plán',updatedAt:1750001000000,
    items:[{exercise:'bridge',sets:1,reps:'10–12'}]}]}));
  const documentRoot = (await command('DOM.getDocument')).root.nodeId;
  const inputId = (await command('DOM.querySelector', {nodeId:documentRoot, selector:'#backup-file'})).nodeId;
  await command('DOM.setFileInputFiles', {files:[importPath], nodeId:inputId});
  for (let i = 0; i < 60 && !await inspect(`document.querySelector('#abduction .last').textContent.includes('28 kg')`); i++)
    await delay(100);
  assert.equal(await inspect(`document.querySelector('#abduction .last').textContent.includes('28 kg')`), true);
  assert.equal(await inspect(`document.querySelector('#sit .last').textContent.includes('3 × 8')`), true);
  assert.equal(await inspect(`document.querySelectorAll('#workout-archive option').length`), 3);
  assert.equal(await inspect(`document.querySelector('#plan-saved option[value=import-plan]').textContent`), 'Importovaný plán');
  const workoutStorage = () => inspect(`localStorage.getItem(workoutKey)`);
  const savedWorkouts = await workoutStorage();
  const invalidBackup = resolve(profile, 'invalid-import.json');
  await writeFile(invalidBackup, JSON.stringify({version:1, entries:{}, workouts:[{id:'damaged'}], plans:[]}));
  const savedBeforeInvalidImport = await inspect(`[storageKey, workoutKey, planStorageKey].map(key => localStorage.getItem(key))`);
  await command('DOM.setFileInputFiles', {files:[invalidBackup], nodeId:inputId});
  await waitFor(`document.getElementById('journal-status').textContent.includes('nepodarilo načítať')`, 'Invalid backup was not rejected');
  assert.deepEqual(await inspect(`[storageKey, workoutKey, planStorageKey].map(key => localStorage.getItem(key))`), savedBeforeInvalidImport);
  const checkedWorkouts = () => inspect(`[...document.querySelectorAll('#history-checks input:checked')].map(input => input.value)`);
  assert.equal((await checkedWorkouts()).length, 2);
  assert.equal(await inspect(`historicalRoles.has('pec') && !historicalRoles.has('gmed')`), true);
  await inspect(`document.querySelector('#history-last-three').click()`);
  assert.equal((await checkedWorkouts()).length, 3);
  assert.equal(await inspect(`historicalRoles.has('pec') && historicalRoles.has('gmed')`), true);
  await inspect(`[...document.querySelectorAll('#history-checks input:checked')].filter(input => input.value !== 'backup-session')
    .forEach(input => input.click())`);
  assert.deepEqual(await checkedWorkouts(), ['backup-session']);
  assert.equal(await inspect(`historicalRoles.get('gmed').main === 1 &&
    historicalRoles.get('tfl').secondary === 1 && !historicalRoles.has('pec')`), true);
  assert.equal(await inspect(`document.querySelector('#history-missing-list').textContent.includes('Veľký prsný sval') &&
    document.querySelector('#history-recommendations a[href="#chest"]') !== null`), true);
  await inspect(`document.querySelector('#history-bodyweight').click()`);
  assert.equal(await inspect(`[...document.querySelectorAll('#history-recommendations a')]
    .every(link => document.querySelector(link.hash).dataset.equipment === 'bodyweight') &&
    document.querySelector('#history-recommendations a[href="#floorpush"]') !== null`), true);
  await inspect(`document.querySelector('#pokrytie').scrollIntoView()`);
  await screenshot('fitcamp-history.png');
  await inspect(`document.querySelector('#history-checks input[value="backup-session"]').click()`);
  assert.equal(await inspect(`document.querySelector('#history-results').hidden &&
    document.querySelectorAll('#workout-archive option').length === 3`), true);
  assert.equal(await workoutStorage(), savedWorkouts);
  await inspect(`document.querySelector('#history-last-month').click()`);
  assert.equal((await checkedWorkouts()).length, 2);
  assert.equal(await inspect(`document.querySelector('#history-last-month').getAttribute('aria-pressed')`), 'true');
  await pressButton('chest', 'start-exercise');
  assert.equal(await inspect(`document.querySelector('#use-last-sets').hidden`), false);
  await inspect(`document.querySelector('#use-last-sets').click()`);
  assert.deepEqual(await inspect(`[...document.querySelectorAll('.set-row-amount')].map(input => input.value)`), ['11','8','']);
  await inspect(`location.hash = '#sideplank'`);
  await delay(150);
  assert.equal(await inspect(`document.querySelector('#sideplank').open`), true);
  await screenshot('fitcamp-side-plank.png');
  await inspect(`location.hash = '#biceps'`);
  await delay(150);
  await inspect(`document.querySelector('#biceps .muscle-map summary').click();
    document.querySelector('#biceps .muscle-map').scrollIntoView({block:'start'})`);
  await screenshot('fitcamp-muscle-map.png');
  await inspect(`location.hash = '#rozc'`);
  await delay(150);
  assert.equal(await inspect(`document.querySelectorAll('#warmup-steps>li').length`), 6);
  assert.equal(await inspect(`Object.values(warmup.groups).every(variants => variants.length === 3 &&
    variants.every(variant => {
      renderWarmupGuide(variant);
      return variant.setup && variant.cue && variant.mistakes && document.getElementById('warmup-image').alt.includes(variant.name) &&
        document.getElementById('warmup-image').src.startsWith('data:image/png;base64,') &&
        document.getElementById('warmup-source').href.startsWith('https://') &&
        document.querySelector('#warmup-video video').dataset.src.startsWith('data:video/mp4;base64,');
    }))`), true);
  assert.equal(await inspect(`document.querySelector('#warmup-clock') === null &&
    !document.querySelector('#rozc').textContent.toLowerCase().includes('stena')`), true);
  await screenshot('fitcamp-warmup.png');
  await inspect(`document.querySelector('[data-warmup-group=ankles] .warmup-info').click()`);
  assert.equal(await inspect(`document.getElementById('warmup-fieldset').hidden &&
    !document.getElementById('warmup-image').closest('figure').hidden &&
    document.getElementById('warmup-setup').textContent.includes('krok vpred')`), true);
  await screenshot('fitcamp-warmup-guide.png');
  await inspect(`document.querySelector('[data-warmup-group=ankles] .warmup-edit').click();
    document.querySelector('#warmup-choices input[value=toeraise]').click();
    document.querySelector('#rozc .demo-toggle').click()`);
  assert.equal(await inspect(`!document.querySelector('#warmup-video').hidden &&
    document.querySelector('[data-warmup-group=ankles] .warmup-selection').textContent.includes('Zdvíhanie špičiek') &&
    document.querySelector('#warmup-source').href.includes('kingstonandrichmond')`), true);
  await inspect(`document.querySelector('[data-warmup-group=shoulders] .warmup-edit').click()`);
  assert.equal(await inspect(`document.querySelectorAll('#rozc .warmup-row button[aria-expanded=true]').length === 1 &&
    document.querySelector('#warmup-video').hidden`), true);
  await screenshot('fitcamp-warmup-options.png');
  await inspect(`document.querySelector('#warmup-choices input[value=""]').click()`);
  assert.equal(await inspect(`document.querySelector('#warmup-guide').hidden &&
    JSON.parse(localStorage.getItem(warmupKey)).shoulders === ''`), true);
  await viewport(320);
  assert.equal(await inspect('document.documentElement.scrollWidth <= innerWidth'), true);
  await viewport(390);
  await inspect(`location.hash = '#pallof'`);
  await delay(150);
  await screenshot('fitcamp-journal-card.png');
  await inspect(`document.querySelector('#finish-running').click(); document.querySelector('#finish-workout').click()`);
  assert.equal(await activeExercise(), null);

  await inspect(`location.hash = '#planovac'; document.querySelector('#load-plan-preset').click()`);
  assert.equal(await inspect(`document.querySelectorAll('#plan-preset option').length`), 4);
  assert.equal(await inspect(`document.querySelectorAll('#plan-items li[data-exercise]').length`), 7);
  assert.equal(await inspect(`document.querySelector('#plan-warnings').children.length`), 0);
  await inspect(`
    const planFilter = document.querySelector('#plan-search');
    planFilter.value = 'incline dumbbell'; planFilter.dispatchEvent(new Event('input'));
    document.querySelector('#plan-picks a[href="#incline"]').closest('li').querySelector('button').click();
    planFilter.value = 'dumbbell bench press'; planFilter.dispatchEvent(new Event('input'));
    document.querySelector('#plan-picks a[href="#dbpress"]').closest('li').querySelector('button').click();
  `);
  assert.equal(await inspect(`document.querySelector('#plan-warnings').textContent.includes('Veľký prsný sval · priame cviky 3, série 6')`), true);
  await inspect(`
    document.querySelector('#plan-items [data-exercise=incline] .plan-item-buttons button:last-child').click();
    document.querySelector('#plan-items [data-exercise=dbpress] .plan-item-buttons button:last-child').click();
    document.querySelector('#plan-items [data-exercise=chest] .plan-item-buttons button').click();
    const name = document.querySelector('#plan-name');
    name.value = 'FitCamp plán na skúšku'; name.dispatchEvent(new Event('input'));
    document.querySelector('#save-plan').click();
  `);
  assert.equal(await inspect(`document.querySelector('#plan-items li').dataset.exercise`), 'chest');
  assert.equal(await inspect(`document.querySelector('#plan-saved option:checked').textContent`), 'FitCamp plán na skúšku');
  await inspect(`document.querySelector('#plan-validation').scrollIntoView({block:'start'})`);
  await screenshot('fitcamp-plan-coverage.png');
  await command('Page.reload');
  for (let i = 0; i < 60 && !await inspect(`document.querySelector('#plan-items li')?.dataset.exercise === 'chest'`); i++)
    await delay(100);
  assert.equal(await inspect(`document.querySelector('#plan-name').value`), 'FitCamp plán na skúšku');
  assert.equal(await inspect(`document.querySelector('[data-warmup-group=shoulders] .warmup-selection').textContent`), 'Vynechané');
  await inspect(`document.querySelector('#start-plan').click()`);
  assert.equal(await inspect(`document.querySelector('#plan-execution-name').textContent`), 'FitCamp plán na skúšku');
  assert.equal(await inspect(`document.querySelector('#plan-execution-status').textContent`), 'Hotovo 0 z 7');
  await inspect(`document.querySelector('#start-next-plan').click()`);
  assert.equal(await activeExercise(), 'chest');
  assert.equal(await inspect(`document.querySelector('#planned-set-dose').textContent.includes('2 série')`), true);
  await enterSet(0, '9', '27,5');
  assert.equal(await inspect(`document.querySelector('#repeat-set-values').hidden`), false);
  await inspect(`document.querySelector('#repeat-set-values').click()`);
  assert.equal(await inspect(`document.querySelectorAll('.set-row-amount')[1].value`), '9');
  assert.equal(await inspect(`document.querySelector('#finish-running').textContent`), 'Uložiť a pokračovať');
  await inspect(`document.querySelector('#finish-running').click()`);
  assert.equal(await inspect(`document.querySelector('#plan-execution-status').textContent`), 'Hotovo 1 z 7');
  assert.equal(await activeExercise(), 'press');
  await command('Page.reload');
  for (let i = 0; i < 60 && await activeExercise() !== 'press'; i++) await delay(100);
  assert.equal(await activeExercise(), 'press');
  assert.equal(await inspect(`document.querySelector('#plan-execution-status').textContent`), 'Hotovo 1 z 7');
  assert.equal(await inspect(`!document.getElementById('live-map-dock').hidden &&
    getComputedStyle(document.querySelector('.app-header')).position === 'sticky'`), true);
  assert.equal(await inspect(`[...document.querySelectorAll('nav a')].every(a => !['#svalovica','#fitcamp'].includes(a.hash))`), true);
  await viewport(320);
  await inspect(`location.hash = '#dennik'`);
  await delay(100);
  assert.equal(await inspect(`[...document.querySelectorAll('main > section:not([hidden])')].map(section => section.id).join(',')`), 'dennik');
  await inspect(`document.querySelector('#history-workouts .history-workout').click()`);
  await delay(80);
  assert.equal(await inspect(`!document.querySelector('#historia-trening').hidden && document.querySelector('#history-workout-detail li') !== null`), true);
  const savedCount = await inspect('savedPlans.length');
  await inspect(`document.querySelector('#save-workout-template').click()`);
  assert.equal(await inspect('savedPlans.length'), savedCount + 1);
  assert.equal(await inspect(`savedPlans[0].items.length > 0 && activeWorkout.running.exercise === 'press'`), true);
  await inspect(`location.hash = '#vykony'; performancePick.value = 'chest'; performancePick.dispatchEvent(new Event('change'))`);
  await delay(80);
  assert.equal(await inspect(`Boolean(document.getElementById('performance-data').querySelector('progress'))`), true);
  assert.equal(await inspect('document.documentElement.scrollWidth <= innerWidth'), true);
  await inspect(`document.querySelector('#press .discard-exercise').click();
    document.querySelector('#finish-workout').click();
    document.querySelector('#start-plan-preset').click()`);
  assert.equal(await activeExercise(), 'press');
  assert.equal(await inspect('activeWorkout.plan.name'), 'Celé telo A');
  await waitFor(`document.querySelector('#press').classList.contains('view-exercise')`, 'First exercise did not open');
  await enterSet(0, '', '20');
  await clickUI('#swap-current-exercise');
  assert.equal(await inspect(`document.querySelector('#substitution-status').textContent.includes('rozpísané série') &&
    !document.querySelector('#substitution-choices button')`), true);
  await clickUI('#exercise-substitutions form button');
  assert.equal(await inspect(`document.querySelector('.set-row-weight').value`), '20');
  await enterSet(0, '', '');
  const savedLibraryBeforeSwap = await inspect('JSON.stringify(savedPlans)');
  await clickUI('#swap-current-exercise');
  await inspect(`substitutionEquipment.select.value = 'floor'; substitutionEquipment.select.dispatchEvent(new Event('change'))`);
  assert.equal(await inspect(`(() => {
    const choices = [...document.querySelectorAll('#substitution-choices button')];
    return choices.some(button => button.dataset.exercise === 'bodyweightsquat') &&
      choices.every(button => cards.get(button.dataset.exercise).dataset.equipmentKind === 'floor');
  })()`), true);
  await screenshot('fitcamp-substitutions.png');
  await clickUI('#substitution-choices button[data-exercise=bodyweightsquat]');
  await waitFor(`!document.querySelector('#teraz').hidden && !activeWorkout.running`, 'Swap did not return to the active plan');
  assert.deepEqual(await inspect('activeWorkout.plan.items[0]'), {exercise:'bodyweightsquat', sets:2, reps:'8–12'});
  assert.equal(await inspect('JSON.stringify(savedPlans)'), savedLibraryBeforeSwap);
  assert.equal(await inspect('planPresets[0].exercises[0][0]'), 'press');
  await command('Page.reload');
  await waitFor(`document.body?.classList.contains('app-ready') && activeWorkout?.plan.items[0].exercise === 'bodyweightsquat'`, 'Swap did not survive reload');
  await clickUI('#start-next-plan');
  await waitFor(`document.querySelector('#bodyweightsquat').classList.contains('view-exercise')`, 'Replacement did not open');
  assert.equal(await activeExercise(), 'bodyweightsquat');
  await enterSet(0, '8');
  await inspect(`location.hash = '#teraz'`);
  await waitFor(`!document.querySelector('#teraz').hidden`, 'Today did not open');
  await clickUI('#plan-execution-list [data-exercise=chest] button');
  await clickUI('#substitution-choices button[data-exercise=floorpush]');
  assert.equal(await inspect('activeWorkout.plan.items[1].exercise'), 'floorpush');
  assert.equal(await inspect(`document.querySelector('.set-row-amount').value`), '8');
  await inspect(`location.hash = '#bodyweightsquat'`);
  await waitFor(`document.querySelector('#bodyweightsquat').classList.contains('view-exercise')`, 'Could not return to replacement');
  await clickUI('#finish-running');
  assert.equal(await activeExercise(), 'floorpush');
  assert.equal(await inspect(`activeWorkout.exercises[0].exercise`), 'bodyweightsquat');
  await inspect(`location.hash = '#planovac'`);
  await waitFor(`!document.querySelector('#planovac').hidden`, 'Plan editor did not open');
  await inspect(`(() => {
    const [muscle, gear] = document.querySelectorAll('#plan-validation .muscle-picker select');
    muscle.value = 'tibant';
    muscle.dispatchEvent(new Event('change'));
    gear.value = 'support';
    gear.dispatchEvent(new Event('change'));
  })()`);
  await clickUI('#plan-validation .muscle-picker li button');
  assert.equal(await inspect(`draft.items.filter(item => item.exercise === 'toeraise').length === 1 &&
    document.querySelector('#plan-validation .muscle-picker li button').disabled &&
    JSON.stringify(savedPlans) === ${JSON.stringify(savedLibraryBeforeSwap)}`), true);
  await inspect(`(() => {
    const datedWorkout = (offset, blocks) => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12).getTime();
      return {id:'comparison-' + Math.abs(offset), startedAt:start, finishedAt:start+2000,
        exercises:blocks.map(([exercise, rows]) => ({exercise, startedAt:start, finishedAt:start+1000,
          sets:rows.map(([amount, weight, side = null]) => ({amount, weight, side}))}))};
    };
    mergeWorkoutHistory([
      datedWorkout(-28, [['chest',[[10,20],[12,20],[8,90]]],['assistpull',[[10,40],[10,50]]],
        ['deadbug',[[6,null,'left']]],['plank',[[25,null]]]]),
      datedWorkout(-2, [['chest',[[10,22.5],[14,20],[9,90]]],['assistpull',[[10,35]]],
        ['deadbug',[[8,null,'left'],[20,null,'right']]],['plank',[[35,null]]]]),
      datedWorkout(-56, [['chest',[[10,99]]]]),
    ]);
    location.hash = '#vykony';
  })()`);
  await waitFor(`!document.querySelector('#vykony').hidden`, 'Performance page did not open');
  const chooseComparison = (id, value) => inspect(`(() => {
    const select = document.getElementById(${JSON.stringify(id)});
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change'));
  })()`);
  const comparisonValues = () => inspect(`['previous','recent','status'].map(key => document.getElementById('comparison-' + key).textContent)`);
  const storedBeforeComparison = await inspect('localStorage.getItem(workoutKey)');
  await chooseComparison('performance-exercise', 'chest');
  await chooseComparison('comparison-mode', 'weight');
  await chooseComparison('comparison-benchmark', '10');
  assert.deepEqual(await comparisonValues(), ['20 kg', '22,5 kg', 'Rozdiel: +2,5 kg']);
  await chooseComparison('comparison-mode', 'amount');
  await chooseComparison('comparison-benchmark', '20');
  assert.deepEqual(await comparisonValues(), ['12 opak.', '14 opak.', 'Rozdiel: +2 opak.']);
  await screenshot('fitcamp-period-comparison.png');
  await chooseComparison('comparison-length', '14');
  assert.deepEqual(await comparisonValues(), ['—', '14 opak.', 'Pre tento výber je výsledok iba v jednom období.']);
  await chooseComparison('comparison-length', '28');
  await chooseComparison('performance-exercise', 'deadbug');
  await chooseComparison('comparison-side', 'left');
  assert.deepEqual(await comparisonValues(), ['6 opak.', '8 opak.', 'Rozdiel: +2 opak.']);
  await chooseComparison('performance-exercise', 'plank');
  assert.deepEqual(await comparisonValues(), ['25 s', '35 s', 'Rozdiel: +10 s']);
  await chooseComparison('performance-exercise', 'assistpull');
  await chooseComparison('comparison-mode', 'weight');
  assert.deepEqual(await comparisonValues(), ['40 kg', '35 kg', 'Rozdiel: -5 kg']);
  assert.equal(await inspect('localStorage.getItem(workoutKey)'), storedBeforeComparison);
  assert.equal(await inspect('document.documentElement.scrollWidth <= innerWidth'), true);
  await assertCleanPage();
  await inspect(`localStorage.clear(); location.hash = '#teraz'`);
  await command('Page.reload');
  await waitFor(`document.body?.classList.contains('app-ready') && !activeWorkout && !workoutHistory.length`, 'Could not isolate the finish scenarios');
  await viewport(390);
  await checkFinish();
  console.log('Chrome: plans, substitutions, adding from muscle maps, logging, warmup, coverage, JSON/CSV, and workout finish passed.');
  }
} finally {
  ws?.close();
  browser.kill();
}
