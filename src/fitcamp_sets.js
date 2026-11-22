const setForm = document.getElementById('record-set');
const setSheet = document.getElementById('set-sheet-rows');
const setStatus = document.getElementById('set-status');
const useLastSets = document.getElementById('use-last-sets');
const sideNames = {both:'obe strany', left:'ľavá', right:'pravá'};
const weightFormat = new Intl.NumberFormat('sk-SK', {maximumFractionDigits:3});
const weightHints = {
  per_dumbbell:'Zadaj váhu jednej jednoručky. Napríklad dve 8 kg činky zapíš ako 8 kg.',
  machine:'Zadaj číslo zo stupnice stroja. Pri stroji na kotúče zadaj súčet naložených kotúčov.',
  total_added:'Zadaj celkovú pridanú váhu. Pri vlastnej váhe bez záťaže môžeš nechať pole prázdne.',
  assistance:'Zadaj hodnotu dopomoci. Väčšia dopomoc zvyčajne zhyb uľahčí.',
  per_stack:'Zadaj hodnotu na jednej kladke. Napríklad 5 kg + 5 kg zapíš ako 5 kg.',
};
let setFormOwner = '';

function validSetAmount(value) {
  return Number.isInteger(value) && value >= 1 && value <= 3600;
}

function validSetWeight(value) {
  return value === null || (Number.isFinite(value) && value >= 0 && value <= 1000);
}

function decodeWorkoutSets(rows, exercise) {
  if (rows === undefined) return [];
  if (!Array.isArray(rows)) throw new Error('Invalid exercise sets');
  const card = cards.get(exercise);
  return rows.map(row => {
    const usesSides = card.dataset.perSide === 'yes';
    if (!row || !validSetAmount(row.amount) || !validSetWeight(row.weight) ||
        (usesSides ? !Object.hasOwn(sideNames, row.side) : row.side !== null)) {
      throw new Error('Invalid set');
    }
    return {amount:row.amount, weight:row.weight, side:row.side};
  });
}

function formatSet(row, exercise) {
  const {setUnit, loadBasis} = cards.get(exercise).dataset;
  const dose = row.amount + (setUnit === 'seconds' ? ' s' : ' op.');
  const weight = row.weight === null ? '' : ' · ' + weightFormat.format(row.weight) + ' kg' +
    (loadBasis === 'per_dumbbell' ? ' / činka' : loadBasis === 'assistance' ? ' dopomoc' : loadBasis === 'per_stack' ? ' / kladka' : '');
  const side = row.side ? ' · ' + sideNames[row.side] : '';
  return dose + weight + side;
}

function lastSets(running) {
  const sessions = [activeWorkout, ...workoutHistory];
  for (const workout of sessions) {
    const previous = workout.exercises.findLast(block => block.exercise === running.exercise && block.sets.length);
    if (previous) return previous.sets;
  }
  return [];
}

function updateDraftActions(running) {
  const filled = Array.from(setSheet.querySelectorAll('input')).some(input => input.value.trim());
  useLastSets.hidden = filled || !lastSets(running).length;
  cards.get(running.exercise).querySelector('.discard-exercise').hidden = filled || running.sets.length > 0;
}

function numberSetRows() {
  Array.from(setSheet.children).forEach((row, index) => {
    const number = index + 1;
    const unit = document.getElementById('set-amount-label').textContent.toLowerCase();
    row.querySelector('.set-row-number').textContent = number;
    row.querySelector('.set-row-amount').setAttribute('aria-label', 'Séria ' + number + ' · ' + unit);
    row.querySelector('.set-row-weight').setAttribute('aria-label', 'Séria ' + number + ' · váha (kg)');
    row.querySelector('.remove-set-row').setAttribute('aria-label', 'Odobrať riadok ' + number);
    row.querySelector('.set-side-select')?.setAttribute('aria-label', 'Séria ' + number + ' · strana');
  });
}

function appendSetRow(running, values) {
  const row = document.createElement('div');
  row.className = 'set-sheet set-sheet-group';
  const number = document.createElement('span');
  number.className = 'set-row-number';
  const amount = document.createElement('input');
  amount.className = 'set-row-amount';
  amount.inputMode = 'numeric';
  amount.autocomplete = 'off';
  amount.enterKeyHint = 'next';
  amount.value = values?.amount ?? '';
  const weight = document.createElement('input');
  weight.className = 'set-row-weight';
  weight.inputMode = 'decimal';
  weight.autocomplete = 'off';
  weight.enterKeyHint = 'next';
  weight.value = values?.weight == null ? '' : String(values.weight).replace('.', ',');
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove-set-row';
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    row.remove();
    if (!setSheet.children.length) appendSetRow(running);
    numberSetRows();
    updateDraftActions(running);
  });
  row.append(number, amount, weight, remove);
  if (cards.get(running.exercise).dataset.perSide === 'yes') {
    const side = document.createElement('select');
    side.className = 'set-side-select';
    for (const [key, label] of Object.entries(sideNames)) side.add(new Option(label, key));
    side.value = values?.side ?? 'both';
    row.append(side);
  }
  setSheet.append(row);
  return amount;
}

function displaySetRows(running, values) {
  setSheet.replaceChildren();
  for (const set of values) appendSetRow(running, set);
  while (setSheet.children.length < 3) appendSetRow(running);
  numberSetRows();
  updateDraftActions(running);
}

function renderSetLog(running) {
  const owner = running ? running.exercise + ':' + running.startedAt : '';
  if (owner === setFormOwner) return;
  setFormOwner = owner;
  setStatus.textContent = '';
  if (!running) {
    setSheet.replaceChildren();
    return;
  }
  const card = cards.get(running.exercise);
  const {setUnit, loadBasis} = card.dataset;
  document.getElementById('set-amount-label').textContent = setUnit === 'seconds' ? 'Výdrž (sekundy)' : 'Opakovania';
  document.getElementById('set-weight-hint').textContent = weightHints[loadBasis];
  displaySetRows(running, running.sets);
}

function savePendingSet(running) {
  const parsed = [];
  for (const [index, row] of Array.from(setSheet.children).entries()) {
    const amountInput = row.querySelector('.set-row-amount');
    const weightInput = row.querySelector('.set-row-weight');
    const amountText = amountInput.value.trim();
    const weightText = weightInput.value.trim();
    if (!amountText && !weightText) continue;
    const amount = Number(amountText);
    const weight = weightText ? Number(weightText.replace(',', '.')) : null;
    const prefix = 'Séria ' + (index + 1) + ' · ';
    if (!/^\d+$/.test(amountText) || !validSetAmount(amount)) {
      const unit = cards.get(running.exercise).dataset.setUnit;
      setStatus.textContent = prefix + (unit === 'seconds' ? 'zadaj výdrž ako celé sekundy.' : 'zadaj celý počet opakovaní.');
      amountInput.focus();
      return false;
    }
    if ((weightText && !/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(weightText)) || !validSetWeight(weight)) {
      setStatus.textContent = prefix + 'zadaj váhu v kg, napríklad 7,5.';
      weightInput.focus();
      return false;
    }
    parsed.push({amount, weight, side:row.querySelector('.set-side-select')?.value ?? null});
  }
  running.sets = parsed;
  cards.get(running.exercise).querySelector('.discard-exercise').hidden = parsed.length > 0;
  return true;
}

setForm.addEventListener('submit', event => event.preventDefault());
setForm.addEventListener('input', () => {
  if (activeWorkout?.running) updateDraftActions(activeWorkout.running);
});
document.getElementById('add-set-row').addEventListener('click', () => {
  const running = activeWorkout?.running;
  if (!running) return;
  const amount = appendSetRow(running);
  numberSetRows();
  amount.focus();
});
document.getElementById('save-sets-draft').addEventListener('click', () => {
  const running = activeWorkout?.running;
  if (!running || !savePendingSet(running)) return;
  setStatus.textContent = persistWorkout() ? 'Rozpracované série uložené.' : 'Prehliadač nepovolil uloženie.';
});
useLastSets.addEventListener('click', () => {
  const running = activeWorkout?.running;
  if (!running) return;
  if (Array.from(setSheet.querySelectorAll('input')).some(input => input.value.trim())) {
    setStatus.textContent = 'Minulé série môžeš načítať, keď sú polia prázdne.';
    return;
  }
  displaySetRows(running, lastSets(running));
  setStatus.textContent = 'Minulé hodnoty sú načítané. Pred uložením ich uprav podľa dneška.';
});

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const cell = String(value);
  return /[,"\r\n]/.test(cell) ? '"' + cell.replaceAll('"', '""') + '"' : cell;
}

function exportSeries() {
  const rows = [[
    'workout_date','workout_id','workout_status','exercise_id','exercise_name','exercise_order','set_number',
    'reps','hold_seconds','weight_kg','weight_basis','side','exercise_started_at','exercise_finished_at','plan_name',
  ]];
  const workouts = activeWorkout ? [...workoutHistory, activeWorkout] : [...workoutHistory];
  workouts.sort((a, b) => a.startedAt - b.startedAt);
  for (const workout of workouts) {
    const name = workout.plan?.name ?? '';
    const csvName = /^[\s]*[=+@-]/.test(name) ? "'" + name : name;
    const blocks = workout.running ? [...workout.exercises, workout.running] : workout.exercises;
    blocks.forEach((block, blockIndex) => {
      const {setUnit, loadBasis} = cards.get(block.exercise).dataset;
      block.sets.forEach((set, setIndex) => {
        rows.push([
          today(new Date(workout.startedAt)), workout.id, workout.finishedAt ? 'completed' : 'in_progress',
          block.exercise, exerciseNames.get(block.exercise), blockIndex+1, setIndex+1,
          setUnit === 'reps' ? set.amount : null, setUnit === 'seconds' ? set.amount : null,
          set.weight, loadBasis, set.side, new Date(block.startedAt).toISOString(),
          block.finishedAt ? new Date(block.finishedAt).toISOString() : null, csvName,
        ]);
      });
    });
  }
  if (rows.length === 1) {
    journalStatus.textContent = 'CSV bude k dispozícii po zapísaní aspoň jednej série.';
    return;
  }
  const contents = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  downloadJournalFile(contents, 'text/csv;charset=utf-8', 'fitcamp-serie-' + today() + '.csv');
  journalStatus.textContent = 'Export obsahuje ' + (rows.length - 1) + ' zapísaných sérií.';
}

document.getElementById('export-sets').addEventListener('click', exportSeries);
