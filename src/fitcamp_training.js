const workoutKey = appStorageKey('fitcamp-active-workout-v1');
const overlapThreshold = 2;
const muscles = JSON.parse(document.getElementById('muscle-names').textContent);
const exerciseNames = new Map(Array.from(cards, ([id, card]) => [id, card.querySelector('.exercise-name').textContent]));
const warning = document.getElementById('overlap-warning');
const finishWorkoutDialog = document.getElementById('finish-workout-dialog');
const workoutArchive = document.getElementById('workout-archive');
const workoutPick = document.getElementById('workout-pick');
const inlineSetPanel = document.getElementById('inline-set-panel');
const setPanelParking = document.getElementById('set-panel-parking');
const workoutStatus = document.getElementById('workout-status');
const workTime = new Intl.DateTimeFormat('sk-SK', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
let activeWorkout = null;
let workoutHistory = [];
let selectedArchive = null;
let candidateId = null;
let finishRequest = null;
let timerId = null;

function isTimestamp(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 8.64e15;
}

function decodeTimedExercise(value, completed) {
  if (!value || !cards.has(value.exercise) || !isTimestamp(value.startedAt)) {
    throw new Error('Invalid timed exercise');
  }
  const result = {exercise:value.exercise, startedAt:value.startedAt, sets:decodeWorkoutSets(value.sets, value.exercise)};
  if (completed) {
    if (!isTimestamp(value.finishedAt) || value.finishedAt < value.startedAt) {
      throw new Error('Invalid finish time');
    }
    result.finishedAt = value.finishedAt;
  } else {
    const draftRows = decodeSetDraft(value.draftRows);
    if (draftRows) result.draftRows = draftRows;
  }
  return result;
}

function decodeWorkout(value, completed) {
  if (!value || typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/i.test(value.id) ||
      !isTimestamp(value.startedAt) || !Array.isArray(value.exercises)) {
    throw new Error('Invalid workout');
  }
  const result = {
    id:value.id, startedAt:value.startedAt,
    exercises:value.exercises.map(value => decodeTimedExercise(value, true)),
  };
  if (value.plan != null) result.plan = decodePlan(value.plan);
  if (completed) {
    if (!isTimestamp(value.finishedAt) || value.finishedAt < value.startedAt || !result.exercises.length) {
      throw new Error('Invalid finished workout');
    }
    result.finishedAt = value.finishedAt;
  } else {
    result.running = value.running == null ? null : decodeTimedExercise(value.running, false);
  }
  return result;
}

function decodeWorkoutHistory(history = []) {
  if (!Array.isArray(history)) throw new Error('Invalid workout history');
  return history.map(value => decodeWorkout(value, true));
}

function loadWorkoutState(value) {
  const state = JSON.parse(value);
  const active = state.active ? decodeWorkout(state.active, false) : null;
  const history = decodeWorkoutHistory(state.history);
  activeWorkout = active;
  workoutHistory = history;
}

function showWorkoutStatus(message) {
  workoutStatus.textContent = message;
  workoutStatus.hidden = !message;
}

try {
  const value = localStorage.getItem(workoutKey);
  if (value) loadWorkoutState(value);
} catch {
  showWorkoutStatus('Rozpracovaný tréning sa nepodarilo načítať.');
}

function persistWorkout() {
  try {
    localStorage.setItem(workoutKey, JSON.stringify({active:activeWorkout, history:workoutHistory}));
    return true;
  } catch {
    showWorkoutStatus('Prehliadač nepovolil trvalé uloženie tréningu. Pred zatvorením tréning ukonči a stiahni zálohu v Denníku.');
    return false;
  }
}

function mergeWorkoutHistory(incoming) {
  const combined = new Map(workoutHistory.map(workout => [workout.id, workout]));
  for (const workout of incoming) {
    const existing = combined.get(workout.id);
    const setCount = item => item.exercises.reduce((total, block) => total + block.sets.length, 0);
    if (!existing || setCount(workout) > setCount(existing)) combined.set(workout.id, workout);
  }
  workoutHistory = Array.from(combined.values())
    .sort((a, b) => b.finishedAt - a.finishedAt);
  const stored = persistWorkout();
  renderWorkout();
  return stored;
}

function formatDuration(milliseconds) {
  const elapsed = Math.floor(Math.max(milliseconds, 0) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = String(Math.floor(elapsed / 60) % 60).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  return (hours ? hours + ':' : '') + minutes + ':' + seconds;
}

function roleCounts(exercises) {
  const counts = new Map();
  for (const block of exercises) {
    const card = cards.get(block.exercise);
    for (const role of ['main','secondary']) {
      for (const muscle of card.dataset[role].split(' ').filter(Boolean)) {
        if (!counts.has(muscle)) counts.set(muscle, {main:0, secondary:0});
        counts.get(muscle)[role]++;
      }
    }
  }
  return counts;
}

function renderWorkoutOverview(workout, roles) {
  const list = document.getElementById('workout-exercises');
  const summary = document.getElementById('workout-muscles');
  list.replaceChildren();
  summary.replaceChildren();
  if (!workout?.exercises.length) {
    document.getElementById('workout-overview').hidden = true;
    return;
  }
  document.getElementById('workout-overview').hidden = false;
  document.getElementById('workout-overview-title').textContent = workout.finishedAt
    ? 'Odcvičené cviky · ' + displayDate(today(new Date(workout.startedAt)))
    : 'Odcvičené v tomto tréningu';
  for (const block of workout.exercises) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#' + block.exercise;
    link.textContent = exerciseNames.get(block.exercise);
    const time = document.createElement('div');
    time.className = 'work-time';
    time.textContent = workTime.format(block.startedAt) + ' – ' + workTime.format(block.finishedAt) +
      ' · ' + formatDuration(block.finishedAt - block.startedAt);
    item.append(link, time);
    if (block.sets.length) {
      const sets = document.createElement('div');
      sets.className = 'saved-set-summary';
      sets.textContent = block.sets.map((set, index) => (index + 1) + '. ' + formatSet(set, block.exercise)).join(' | ');
      item.append(sets);
    }
    list.append(item);
  }
  const counts = Array.from(roles)
    .sort(([idA, a], [idB, b]) => b.main - a.main || b.secondary - a.secondary ||
      muscles[idA].localeCompare(muscles[idB], 'sk'));
  for (const [id, count] of counts) {
    const row = document.createElement('div');
    row.className = 'muscle-line';
    const name = document.createElement('strong');
    name.textContent = muscles[id];
    const details = document.createElement('span');
    details.textContent = count.main + '× hlavné · ' + count.secondary + '× pomocné';
    row.append(name, details);
    summary.append(row);
  }
}

function updateClock() {
  const running = activeWorkout?.running;
  if (!running) return;
  const elapsed = formatDuration(Date.now() - running.startedAt);
  document.querySelector('.workout-clock').textContent = elapsed;
  cards.get(running.exercise).querySelector('.exercise-clock').textContent = elapsed;
}

function renderWorkout() {
  const running = activeWorkout?.running;
  document.getElementById('workout-picker').hidden = Boolean(running);
  document.getElementById('start-picked').classList.toggle('save', !activeWorkout?.plan);
  document.getElementById('finish-workout').hidden = !activeWorkout;
  document.getElementById('workout-active').hidden = !running;
  if (running) {
    const link = document.getElementById('workout-active-link');
    link.href = '#' + running.exercise;
    link.textContent = exerciseNames.get(running.exercise);
  }
  for (const [id, card] of cards) {
    const isRunning = id === running?.exercise;
    card.querySelector('.start-exercise').hidden = isRunning;
    card.querySelector('.discard-exercise').hidden = !isRunning || Boolean(running.sets.length);
    card.querySelector('.exercise-clock').hidden = !isRunning;
    card.querySelector('.exercise-dose').hidden = isRunning &&
      Boolean(activeWorkout?.plan?.items.some(item => item.exercise === id));
    card.querySelector('.track').hidden = isRunning;
  }
  const logHost = running ? cards.get(running.exercise).querySelector('.set-log-slot') : setPanelParking;
  if (inlineSetPanel.parentElement !== logHost) logHost.append(inlineSetPanel);
  const archiveField = document.getElementById('workout-archive-field');
  archiveField.hidden = Boolean(activeWorkout) || !workoutHistory.length;
  let displayed = activeWorkout;
  if (!archiveField.hidden) {
    workoutArchive.replaceChildren();
    displayed = workoutHistory.find(workout => workout.id === selectedArchive) ?? workoutHistory[0];
    for (const workout of workoutHistory) {
      const option = document.createElement('option');
      option.value = workout.id;
      option.textContent = displayDate(today(new Date(workout.startedAt))) +
        ' · ' + workTime.format(workout.startedAt) +
        (workout.plan ? ' · ' + workout.plan.name : ' · cviky ' + workout.exercises.length);
      option.selected = workout.id === displayed.id;
      workoutArchive.append(option);
    }
  }
  const roles = roleCounts(displayed?.exercises ?? []);
  renderWorkoutOverview(displayed, roles);
  renderCoverage(displayed, roles, running);
  renderPlanExecution(activeWorkout);
  refreshHistoryChoices();
  renderSetLog(running);
  document.getElementById('finish-running').textContent = hasNextAfter(running)
    ? 'Uložiť a pokračovať' : 'Uložiť série a ukončiť cvik';
  document.dispatchEvent(new Event('exehel:workout'));
  if (running && timerId === null) timerId = setInterval(updateClock, 1000);
  if (!running && timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  updateClock();
}

function newWorkout(startedAt, plan = null) {
  const id = startedAt + '-' + Math.random().toString(36).slice(2);
  return {id, startedAt, running:null, exercises:[], plan};
}

function hasNextAfter(running) {
  if (!running || !activeWorkout?.plan) return false;
  return activeWorkout.plan.items.some(item => item.exercise !== running.exercise &&
    !activeWorkout.exercises.some(block => block.exercise === item.exercise));
}

function exerciseFeedback(id, message) {
  const feedback = cards.get(id).querySelector('.exercise-feedback');
  feedback.hidden = !message;
  feedback.textContent = message;
}

function beginExercise(id) {
  if (activeWorkout?.running) {
    exerciseFeedback(id, 'Najprv ukonči bežiaci cvik. Nájdeš ho v časti Aktuálny tréning.');
    return;
  }
  const now = Date.now();
  activeWorkout ??= newWorkout(now);
  activeWorkout.running = {exercise:id, startedAt:now, sets:[]};
  cards.get(id).querySelector('.set-log-result').hidden = true;
  showWorkoutStatus('');
  exerciseFeedback(id, '');
  persistWorkout();
  renderWorkout();
  if (location.hash !== '#' + id) location.hash = id;
}

function requestExercise(id) {
  if (activeWorkout?.running) {
    beginExercise(id);
    return;
  }
  const counts = roleCounts(activeWorkout?.exercises ?? []);
  const overlaps = cards.get(id).dataset.main.split(' ')
    .filter(muscle => (counts.get(muscle)?.main ?? 0) >= overlapThreshold);
  if (!overlaps.length) {
    beginExercise(id);
    return;
  }
  candidateId = id;
  warning.returnValue = '';
  document.getElementById('overlap-exercise').textContent =
    'Cvik „' + exerciseNames.get(id) + '“ opäť zapojí tieto svaly ako hlavné.';
  const list = document.getElementById('overlap-list');
  list.replaceChildren();
  for (const muscle of overlaps) {
    const item = document.createElement('li');
    item.textContent = muscles[muscle] + ' · doteraz ' + counts.get(muscle).main + '× ako hlavný sval';
    list.append(item);
  }
  warning.showModal();
}

function finishExercise(id, completed, {endWorkout = false} = {}) {
  const running = activeWorkout?.running;
  if (!running || running.exercise !== id) return;
  if (!completed && running.sets.length && !endWorkout) return;
  if (completed && !savePendingSet(running)) {
    exerciseFeedback(id, 'Dokonči alebo uprav rozpísanú sériu nižšie v karte.');
    return;
  }
  activeWorkout.running = null;
  if (completed) {
    const finishedAt = Math.max(Date.now(), running.startedAt);
    activeWorkout.exercises.push({
      exercise:id, startedAt:running.startedAt, finishedAt, sets:running.sets,
    });
    const card = cards.get(id);
    const date = today(new Date(finishedAt));
    const oldEntry = entries[id];
    if (!oldEntry || oldEntry.date < date || (oldEntry.date === date && oldEntry.savedAt <= finishedAt)) {
      const noteInput = card.querySelector('.exercise-note');
      const note = card.querySelector('.edit-date').hidden ? noteInput.value.trim() : '';
      entries[id] = {date, note, savedAt:finishedAt};
      if (note) noteInput.value = '';
      persist();
      renderJournal();
    }
    exerciseFeedback(id, 'Odcvičené · ' + formatDuration(finishedAt - running.startedAt));
    const result = card.querySelector('.set-log-result');
    result.querySelector('p').textContent = running.sets.length
      ? 'Cvik ukončený. Zapísané série · ' + running.sets.length + '.'
      : 'Cvik ukončený.';
    result.hidden = false;
  } else {
    exerciseFeedback(id, 'Meranie zrušené.');
  }
  showWorkoutStatus('');
  if (endWorkout) archiveActiveWorkout();
  else {
    persistWorkout();
    renderWorkout();
  }
  return true;
}

warning.addEventListener('close', () => {
  if (warning.returnValue === 'continue' && candidateId) beginExercise(candidateId);
  candidateId = null;
});
for (const [id, card] of cards) {
  card.querySelector('.start-exercise').addEventListener('click', () => requestExercise(id));
  card.querySelector('.discard-exercise').addEventListener('click', () => finishExercise(id, false));
}

for (const group of groups) {
  const options = document.createElement('optgroup');
  options.label = group.dataset.group;
  for (const card of group.querySelectorAll('details.card')) {
    const option = document.createElement('option');
    option.value = card.id;
    option.textContent = exerciseNames.get(card.id);
    options.append(option);
  }
  workoutPick.append(options);
}
document.getElementById('start-picked').addEventListener('click', () => {
  if (workoutPick.value) requestExercise(workoutPick.value);
  else {
    showWorkoutStatus('Najprv vyber cvik.');
    workoutPick.focus();
  }
});
document.getElementById('finish-running').addEventListener('click', () => {
  const running = activeWorkout?.running;
  const advance = hasNextAfter(running);
  if (finishExercise(running?.exercise, true) && advance) startNextPlanExercise();
});
function archiveActiveWorkout() {
  if (!activeWorkout) return;
  const {id, startedAt, exercises, plan} = activeWorkout;
  activeWorkout = null;
  selectedArchive = id;
  showWorkoutStatus(exercises.length ? 'Tréning ukončený.' : 'Tréning ukončený bez cvikov.');
  if (exercises.length) {
    const finishedAt = Math.max(Date.now(), exercises.at(-1).finishedAt);
    mergeWorkoutHistory([{id, startedAt, exercises, finishedAt, plan}]);
  } else {
    persistWorkout();
    renderWorkout();
  }
  if (location.hash !== '#teraz') location.hash = 'teraz';
}

function requestWorkoutFinish() {
  if (!activeWorkout) return;
  const running = activeWorkout.running;
  if (!running) {
    archiveActiveWorkout();
    return;
  }
  finishRequest = {workout:activeWorkout.id, exercise:running.exercise, startedAt:running.startedAt};
  document.getElementById('finish-workout-description').textContent =
    'Rozpracovaný cvik: ' + exerciseNames.get(running.exercise) + '. Už ukončené cviky zostanú v tréningu.';
  finishWorkoutDialog.showModal();
}

function openInvalidSet(exercise) {
  const invalid = setForm.querySelector('[aria-invalid=true]');
  const target = '#' + exercise + '-log';
  if (location.hash === target) invalid?.focus();
  else {
    window.addEventListener('hashchange', () => invalid?.focus(), {once:true});
    location.hash = target;
  }
}

document.getElementById('finish-workout').addEventListener('click', requestWorkoutFinish);
document.getElementById('finish-workout-from-exercise').addEventListener('click', requestWorkoutFinish);
finishWorkoutDialog.addEventListener('cancel', () => { finishRequest = null; });
finishWorkoutDialog.querySelector('form').addEventListener('submit', event => {
  event.preventDefault();
  const request = finishRequest;
  finishRequest = null;
  const action = event.submitter?.value;
  finishWorkoutDialog.close(action);
  const running = activeWorkout?.running;
  if (!request || !running || request.workout !== activeWorkout.id || request.exercise !== running.exercise ||
      request.startedAt !== running.startedAt || !['save','discard'].includes(action)) return;
  if (!finishExercise(running.exercise, action === 'save', {endWorkout:true}) && action === 'save') {
    openInvalidSet(running.exercise);
  }
});
workoutArchive.addEventListener('change', () => {
  selectedArchive = workoutArchive.value;
  renderWorkout();
});
window.addEventListener('storage', event => {
  if (event.key !== workoutKey || !event.newValue) return;
  try {
    loadWorkoutState(event.newValue);
    renderWorkout();
  } catch {
    showWorkoutStatus('Zmeny tréningu z druhého okna sa nepodarilo načítať.');
  }
});
renderWorkout();
