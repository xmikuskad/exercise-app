import assert from 'node:assert/strict';

export async function checkWorkoutFinishFlow({inspect, clickUI, waitFor, reload, assertCleanPage}) {
  const dialog = '#finish-workout-dialog';
  const navigate = async hash => {
    await inspect(`location.hash = ${JSON.stringify(hash)}`);
    await waitFor(`location.hash === ${JSON.stringify(hash)} && !document.querySelector('${hash}').closest('main > section').hidden`, 'Page did not navigate to ' + hash);
  };
  const startFromToday = async exercise => {
    await navigate('#teraz');
    await inspect(`document.querySelector('#workout-pick').value = ${JSON.stringify(exercise)}`);
    await clickUI('#start-picked');
    await waitFor(`location.hash === '#${exercise}' && document.querySelector('#${exercise}').classList.contains('view-exercise')`, 'Exercise did not open');
  };
  const enter = async (amount, weight) => inspect(`(() => {
    const [amount, weight] = document.querySelectorAll('#set-sheet-rows input');
    amount.value = ${JSON.stringify(amount)};
    weight.value = ${JSON.stringify(weight)};
    amount.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  const finish = async (button, action) => {
    await clickUI(button);
    assert.equal(await inspect(`Boolean(document.getElementById('finish-workout-dialog')?.open)`), true,
      'Finish must offer a way to resolve the running exercise. App status: ' +
      await inspect(`document.getElementById('workout-status').textContent`));
    await clickUI(dialog + ' button[value="' + action + '"]');
  };

  await clickUI('#start-free-workout');
  await startFromToday('press');
  await enter('', '25');
  await navigate('#teraz');
  await finish('#finish-workout', 'keep');
  assert.equal(await inspect(`activeWorkout.running.exercise`), 'press');
  await finish('#finish-workout', 'save');
  await waitFor(`location.hash === '#press-log' && document.activeElement.matches('.set-row-amount[aria-invalid=true]')`,
    'Invalid draft did not open and focus its first invalid field');
  assert.equal(await inspect(`JSON.parse(localStorage.getItem(workoutKey)).active.running.draftRows[0].weight`), '25');
  await enter('9', '25,5');
  await finish('#finish-workout-from-exercise', 'save');
  await waitFor(`!activeWorkout && !document.getElementById('teraz').hidden`, 'Workout was not archived');
  assert.deepEqual(await inspect(`workoutHistory[0].exercises[0].sets`), [{amount:9, weight:25.5, side:null}]);
  assert.equal(await inspect(`document.getElementById('workout-status').getClientRects().length > 0`), true);

  await clickUI('#start-free-workout');
  await startFromToday('chest');
  await clickUI('#finish-running');
  await startFromToday('row');
  await enter('12', '30');
  await navigate('#teraz');
  await finish('#finish-workout', 'discard');
  await waitFor('!activeWorkout', 'Discard did not close the workout');
  assert.deepEqual(await inspect('workoutHistory[0].exercises.map(block => block.exercise)'), ['chest']);

  await clickUI('#start-free-workout');
  await startFromToday('press');
  await navigate('#teraz');
  await finish('#finish-workout', 'discard');
  await waitFor('!activeWorkout', 'Empty workout did not close');
  assert.equal(await inspect('workoutHistory.length'), 2);

  await navigate('#planovac');
  await clickUI('#start-plan-preset');
  await waitFor(`location.hash === '#press' && document.querySelector('#press').classList.contains('view-exercise')`, 'Preset exercise did not open');
  await enter('8', '20');
  await finish('#finish-workout-from-exercise', 'save');
  await waitFor('!activeWorkout', 'Finishing a plan started its next exercise');
  assert.deepEqual(await inspect(`workoutHistory[0].exercises.map(block => block.exercise)`), ['press']);
  assert.equal(await inspect(`workoutHistory[0].plan.name`), 'Celé telo A');
  await assertCleanPage();
  await reload();
  await waitFor(`document.body?.classList.contains('app-ready') && workoutHistory.length === 3`, 'Archived workouts did not survive reload');
  assert.equal(await inspect(`activeWorkout`), null);
  await assertCleanPage();
}
