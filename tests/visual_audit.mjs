import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

export async function captureVisualAudit({command, inspect, waitFor, output}) {
  await mkdir(output, {recursive:true});
  const results = [];
  let width;
  async function route(hash) {
    await inspect(`location.hash = ${JSON.stringify(hash)}`);
    await waitFor(`location.hash === '#${hash}' &&
      !document.getElementById('${hash}').closest('main > section').hidden`, 'Audit route did not open: ' + hash);
    await inspect('new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))');
  }
  async function snap(name) {
    const state = await inspect(`({
      viewport:innerWidth, content:document.documentElement.scrollWidth,
      screen:document.querySelector('main > section:not([hidden])')?.id,
    })`);
    const image = await command('Page.captureScreenshot', {format:'png', fromSurface:true});
    await writeFile(resolve(output, width + '-' + name + '.png'), Buffer.from(image.data, 'base64'));
    results.push({width, name, ...state});
  }
  const screens = ['teraz','planovac','cviky','press','rozc','dennik','pomoc','svalovica','fitcamp',
    'anatomia','sprava-dat','treningy','progres'];
  for (width of [320, 390, 1280]) {
    await command('Emulation.setDeviceMetricsOverride', {width, height:width < 500 ? 820 : 900,
      deviceScaleFactor:1, mobile:width < 500});
    await inspect(`activeWorkout = null; workoutHistory = []; openDraft(emptyPlan()); renderWorkout()`);
    for (const screen of screens) {
      await route(screen);
      await snap(screen);
    }
    for (const screen of ['pokrytie','vykony','tyzdne']) {
      await route(screen);
      await snap(screen + '-empty');
    }
    await route('rozc');
    await inspect(`document.querySelector('[data-warmup-group=knees] .warmup-info').click()`);
    await snap('rozc-pokyny');
    await inspect(`document.querySelector('[data-warmup-group=knees] .warmup-edit').click()`);
    await snap('rozc-moznosti');
    await inspect(`(() => {
      const now = new Date();
      const day = offset => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12).getTime();
      const sample = (offset, weight) => ({
        id:'visual-' + Math.abs(offset), startedAt:day(offset), finishedAt:day(offset) + 20000,
        exercises:['press','chest','dbpress','row'].map(exercise => ({exercise, startedAt:day(offset), finishedAt:day(offset) + 10000,
          sets:[{amount:10, weight, side:null},{amount:8, weight:weight+5, side:null}]})),
      });
      workoutHistory = [sample(-2,25),sample(-12,22.5),sample(-30,20),sample(-38,17.5)];
      renderWorkout();
    })()`);
    for (const screen of ['dennik','historia-trening','pokrytie','vykony','tyzdne']) {
      await route(screen);
      await snap(screen + '-with-data');
    }
    await route('planovac');
    await inspect(`document.getElementById('load-plan-preset').click()`);
    await snap('planovac-editor');
    await inspect(`document.getElementById('plan-validation').scrollIntoView({block:'start'})`);
    await snap('planovac-svaly');
    await inspect(`startPlanWorkout(completePlanDraft(), true)`);
    await route('press');
    await snap('press-active');
    await route('press-log');
    await snap('press-series');
    await route('press-muscles');
    await snap('press-muscles');
    await route('press-technique');
    await snap('press-technique');
    await route('teraz');
    await snap('teraz-active');
    for (const [trigger, dialog, name] of [
      ['#live-map-dock','#coverage-dialog','live-map'],
      ['#finish-workout','#finish-workout-dialog','finish-dialog'],
      ['#plan-execution-list [data-exercise=press] button','#exercise-substitutions','substitution-dialog'],
    ]) {
      await inspect(`document.querySelector('${trigger}').click()`);
      await waitFor(`document.querySelector('${dialog}').open`, 'Dialog did not open: ' + dialog);
      await snap(name);
      await inspect(`document.querySelector('${dialog}').close()`);
      await inspect('new Promise(done => requestAnimationFrame(done))');
    }
    await inspect(`activeWorkout.running = null; activeWorkout.exercises = workoutHistory[0].exercises.slice(1,3);
      renderWorkout(); requestExercise('incline')`);
    await waitFor(`document.getElementById('overlap-warning').open`, 'Overlap warning did not open');
    await snap('overlap');
    await inspect(`document.getElementById('overlap-warning').close()`);
  }
  if (process.env.EXEHEL_AUDIT_ILLUSTRATIONS === '1') {
    const illustrations = await inspect(`[...cards].map(([id, card]) => [id, card.querySelector('.demo-stills img').src.split(',')[1]])`);
    await mkdir(resolve(output, 'illustrations'), {recursive:true});
    for (const [id, png] of illustrations) await writeFile(resolve(output, 'illustrations', id + '.png'), Buffer.from(png, 'base64'));
  }
  await writeFile(resolve(output, 'screens.json'), JSON.stringify(results, null, 2));
  const overflows = results.filter(item => item.content > item.viewport + 1);
  console.log('Visual audit: ' + results.length + ' screenshots. Horizontal overflow: ' + JSON.stringify(overflows));
  assert.deepEqual(overflows, []);
}
