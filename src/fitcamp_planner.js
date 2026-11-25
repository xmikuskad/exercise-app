const planStorageKey = appStorageKey('fitcamp-plans-v1');
const planName = document.getElementById('plan-name');
const planPresetSelect = document.getElementById('plan-preset');
const planSavedSelect = document.getElementById('plan-saved');
const planSearch = document.getElementById('plan-search');
const planGroup = document.getElementById('plan-group');
const planStatus = document.getElementById('plan-status');
const planCanvasContext = document.getElementById('plan-muscle-canvas').getContext('2d');
const planCoverageParts = createCoverageParts(document.getElementById('plan-coverage-parts'));
const planPresets = [
  {name:'Celé telo A', description:'Prvá návšteva. Tlak na nohy, hrudník, vodorovný ťah a doplnky na zadné stehná, lýtka, biceps a brucho.',
    exercises:[['press',2],['chest',2],['row',2],['curl',1],['calfstanding',1],['biceps',1],['deadbug',1]]},
  {name:'Celé telo B', description:'Druhá návšteva po zotavení. Horná kladka, zadok, bočné ramená, triceps a stred tela doplnia plán A.',
    exercises:[['goblet',2],['lat',2],['chest',2],['bridge',1],['lateral',1],['pushdown',1],['pallof',1]]},
  {name:'Ľahký tréning C', description:'Voliteľná tretia návšteva. Jedna ľahká séria z každého cviku. Vyber ju, keď už pri rozcvičke cítiš, že si zotavený.',
    exercises:[['stepup',1],['push',1],['supportedrow',1],['calfstanding',1],['sideplank',1]]},
  {name:'Horná časť tela a stred', description:'Variant na deň, keď stehná ešte cítiš. Daj nohám čas a vráť sa k A/B, keď je pravidelný pohyb komfortný.',
    exercises:[['chest',2],['row',2],['lateral',1],['biceps',1],['pushdown',1],['deadbug',1]]},
];

function emptyPlan() {
  return {id:'', name:'', updatedAt:0, items:[]};
}

let draft = emptyPlan();
let savedPlans = [];
let planCounts = new Map();

function defaultPlanItem(exercise, sets = 2) {
  return {exercise, sets, reps:cards.get(exercise).dataset.prescription};
}

function decodePlan(value, allowDraft = false) {
  if (!value || typeof value.id !== 'string' ||
      (!/^[a-z0-9][a-z0-9-]{0,79}$/i.test(value.id) && !(allowDraft && value.id === '')) ||
      typeof value.name !== 'string' || value.name.length > 70 ||
      (!allowDraft && !value.name.trim()) || !Number.isSafeInteger(value.updatedAt) ||
      !Array.isArray(value.items) || (!allowDraft && !value.items.length)) {
    throw new Error('Invalid plan');
  }
  const seen = new Set();
  const items = value.items.map(item => {
    if (!item || !cards.has(item.exercise) || seen.has(item.exercise) ||
        !Number.isInteger(item.sets) || item.sets < 1 || item.sets > 12 ||
        typeof item.reps !== 'string' || !item.reps.trim() || item.reps.length > 32) {
      throw new Error('Invalid planned exercise');
    }
    seen.add(item.exercise);
    return {exercise:item.exercise, sets:item.sets, reps:item.reps};
  });
  return {id:value.id, name:value.name, updatedAt:value.updatedAt, items};
}

function decodePlans(value = []) {
  if (!Array.isArray(value)) throw new Error('Invalid plan library');
  return value.map(item => decodePlan(item));
}

function loadPlanState(text) {
  const state = JSON.parse(text);
  const restoredPlans = decodePlans(state.saved);
  const restoredDraft = decodePlan(state.draft, true);
  savedPlans = restoredPlans;
  draft = restoredDraft;
}

try {
  const text = localStorage.getItem(planStorageKey);
  if (text) loadPlanState(text);
} catch {
  planStatus.textContent = 'Uložené plány sa nepodarilo načítať.';
}

function persistPlans() {
  try {
    localStorage.setItem(planStorageKey, JSON.stringify({saved:savedPlans, draft}));
    return true;
  } catch {
    planStatus.textContent = 'Prehliadač nepovolil uloženie. Stiahni si zálohu JSON z Denníka.';
    return false;
  }
}

function mergePlanLibrary(incoming) {
  const byId = new Map(savedPlans.map(plan => [plan.id, plan]));
  for (const plan of incoming) {
    const existing = byId.get(plan.id);
    if (!existing || plan.updatedAt > existing.updatedAt) byId.set(plan.id, plan);
  }
  savedPlans = Array.from(byId.values()).sort((a,b) => b.updatedAt - a.updatedAt);
  renderSavedPlans();
  return persistPlans();
}

function planIdentity() {
  return Date.now() + '-' + Math.random().toString(36).slice(2);
}

function completePlanDraft(asCopy = false) {
  if (!draft.items.length) {
    planStatus.textContent = 'Pridaj aspoň jeden cvik.';
    planSearch.focus();
    return null;
  }
  const name = draft.name.trim();
  if (!name) {
    planStatus.textContent = 'Daj tréningu názov.';
    planName.focus();
    return null;
  }
  return decodePlan({
    ...draft, name,
    id: asCopy ? planIdentity() : draft.id || planIdentity(),
    updatedAt:Date.now(),
  });
}

function plannedDose(item) {
  const series = item.sets === 1 ? 'séria' : item.sets <= 4 ? 'série' : 'sérií';
  const unit = cards.get(item.exercise).dataset.setUnit;
  const target = unit !== 'reps' || /\bop\b/i.test(item.reps) ? item.reps
    : item.reps.includes(' / ') ? item.reps.replace(' / ', ' op. / ') : item.reps + ' op.';
  return item.sets + ' ' + series + ' · ' + target;
}

function openDraft(plan) {
  draft = decodePlan(plan, true);
  planName.value = draft.name;
  planSearch.value = '';
  planGroup.value = '';
  planStatus.textContent = '';
  persistPlans();
  renderPlanner();
}

function saveDraft(asCopy) {
  const plan = completePlanDraft(asCopy);
  if (!plan) return;
  draft = decodePlan(plan, true);
  setPlanEditorTitle();
  if (storePlan(plan)) planStatus.textContent = 'Uložený plán · ' + plan.name;
}

function storePlan(plan) {
  savedPlans = [plan, ...savedPlans.filter(existing => existing.id !== plan.id)];
  renderSavedPlans(plan.id);
  return persistPlans();
}

function makePlanButton(label, click, ariaLabel) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  button.addEventListener('click', click);
  return button;
}

function exerciseLink(exercise) {
  const link = document.createElement('a');
  link.href = '#' + exercise;
  link.textContent = exerciseNames.get(exercise);
  return link;
}

function setPlanEditorTitle() {
  document.getElementById('plan-editor-title').textContent = draft.id ? 'Úprava plánu' : 'Zostava tréningu';
  document.getElementById('duplicate-plan').hidden = !draft.id;
}

function renderSavedPlans(selected = draft.id || planSavedSelect.value) {
  planSavedSelect.replaceChildren(new Option(savedPlans.length ? 'Vyber uložený plán' : 'Zatiaľ bez uložených plánov', ''));
  for (const plan of savedPlans) planSavedSelect.add(new Option(plan.name, plan.id));
  if (savedPlans.some(plan => plan.id === selected)) planSavedSelect.value = selected;
  document.getElementById('start-saved-plan').disabled = !planSavedSelect.value;
  document.getElementById('load-saved-plan').disabled = !savedPlans.length;
}

function renderPlanItems() {
  const list = document.getElementById('plan-items');
  list.replaceChildren();
  if (!draft.items.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Pridaj cvik nižšie alebo načítaj šablónu.';
    list.append(empty);
    return;
  }
  draft.items.forEach((item, index) => {
    const row = document.createElement('li');
    const name = exerciseNames.get(item.exercise);
    row.dataset.exercise = item.exercise;
    row.append(exerciseLink(item.exercise));
    const fields = document.createElement('div');
    fields.className = 'plan-item-tools';
    const setsLabel = document.createElement('label');
    setsLabel.className = 'field';
    setsLabel.textContent = 'Série';
    const sets = document.createElement('input');
    sets.type = 'number';
    sets.inputMode = 'numeric';
    sets.min = 1;
    sets.max = 12;
    sets.value = item.sets;
    sets.addEventListener('input', () => {
      const value = Number(sets.value);
      if (!Number.isInteger(value) || value < 1 || value > 12) return;
      item.sets = value;
      persistPlans();
      renderPlanValidation();
    });
    sets.addEventListener('change', () => { sets.value = item.sets; });
    setsLabel.append(sets);

    const repsLabel = document.createElement('label');
    repsLabel.className = 'field plan-item-reps';
    repsLabel.textContent = cards.get(item.exercise).dataset.setUnit === 'seconds' ? 'Výdrž' : 'Opakovania';
    const reps = document.createElement('input');
    reps.maxLength = 32;
    reps.value = item.reps;
    reps.addEventListener('change', () => {
      item.reps = reps.value.trim() || cards.get(item.exercise).dataset.prescription;
      reps.value = item.reps;
      persistPlans();
    });
    repsLabel.append(reps);
    const move = direction => {
      const next = index + direction;
      [draft.items[index], draft.items[next]] = [draft.items[next], draft.items[index]];
      persistPlans();
      renderPlanItems();
      list.querySelector('[data-exercise="' + item.exercise + '"] input').focus();
    };
    const up = makePlanButton('↑', () => move(-1), 'Presunúť vyššie · ' + name);
    const down = makePlanButton('↓', () => move(1), 'Presunúť nižšie · ' + name);
    up.disabled = index === 0;
    down.disabled = index === draft.items.length - 1;
    const remove = makePlanButton('×', () => {
      draft.items.splice(index, 1);
      persistPlans();
      renderPlanDraftContents();
    }, 'Odobrať · ' + name);
    const actions = document.createElement('div');
    actions.className = 'plan-item-buttons';
    actions.append(up, down, remove);
    fields.append(setsLabel, repsLabel, actions);
    row.append(fields);
    list.append(row);
  });
}

function renderPlanPicks() {
  const list = document.getElementById('plan-picks');
  list.replaceChildren();
  const query = normalize(planSearch.value).trim().split(/\s+/).filter(Boolean);
  const included = new Set(draft.items.map(item => item.exercise));
  const matches = Array.from(cards.values()).filter(card =>
    !included.has(card.id) && (!planGroup.value || card.parentElement.id === planGroup.value) &&
    query.every(word => names.get(card.id).includes(word)));
  if (!query.length && !planGroup.value) {
    matches.sort((a,b) => Number(Boolean(b.querySelector('.priority.base'))) - Number(Boolean(a.querySelector('.priority.base'))));
  }
  if (!matches.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Ďalší cvik pri tomto výbere sa nenašiel.';
    list.append(empty);
  }
  for (const card of matches.slice(0, 8)) {
    const row = document.createElement('li');
    const meta = document.createElement('div');
    const category = document.createElement('small');
    category.textContent = card.parentElement.dataset.group + ' · ' + card.querySelector('.priority').textContent;
    meta.append(exerciseLink(card.id), category);
    row.append(meta, makePlanButton('Pridať', () => {
      draft.items.push(defaultPlanItem(card.id));
      if (persistPlans()) planStatus.textContent = 'Pridané · ' + exerciseNames.get(card.id);
      renderPlanDraftContents();
    }, 'Pridať · ' + exerciseNames.get(card.id)));
    list.append(row);
  }
}

function renderPlanValidation() {
  document.getElementById('plan-validation').hidden = !draft.items.length;
  document.getElementById('plan-review-link').hidden = !draft.items.length;
  planCounts = roleCounts(draft.items);
  updateCoverageParts(planCoverageParts, planCounts);
  paintMuscleMap(planCanvasContext, planCounts);
  if (!draft.items.length) return;
  const plannedSets = new Map();
  for (const item of draft.items) {
    const targets = cards.get(item.exercise).dataset.main.split(' ');
    for (const target of targets) plannedSets.set(target, (plannedSets.get(target) ?? 0) + item.sets);
  }
  const total = draft.items.reduce((sum, item) => sum + item.sets, 0);
  const gaps = planCoverageParts.filter(part => part.link.dataset.state !== 'main')
    .map(part => part.link.textContent);
  document.getElementById('plan-validation-summary').textContent =
    'Cviky · ' + draft.items.length + ' | Pracovné série · ' + total +
    (gaps.length ? ' | Bez priameho cviku · ' + gaps.join(', ') : ' | Každá partia má priamy cvik.');
  const warnings = document.getElementById('plan-warnings');
  warnings.replaceChildren();
  const doses = document.getElementById('plan-direct-doses');
  doses.replaceChildren();
  const sorted = Array.from(plannedSets.entries()).sort((a,b) => b[1]-a[1]);
  for (const [target, sets] of sorted) {
    const count = planCounts.get(target);
    const detail = document.createElement('li');
    detail.textContent = muscles[target] + ' · ' + sets;
    doses.append(detail);
    if (count.main < 3 && sets < 6) continue;
    const warning = document.createElement('li');
    warning.textContent = muscles[target] + ' · priame cviky ' + count.main + ', série ' + sets + '. Zváž menší objem alebo iný cvik.';
    warnings.append(warning);
  }
  document.getElementById('plan-warnings-empty').textContent = warnings.children.length
    ? 'Svaly s vyšším plánovaným objemom' : 'Priame zapojenie sa zmestí pod nastavené prahy.';
}

function renderPlanDraftContents() {
  renderPlanItems();
  renderPlanPicks();
  renderPlanValidation();
}

function renderPlanner() {
  setPlanEditorTitle();
  renderSavedPlans();
  renderPlanDraftContents();
}

function nextPlanItem(workout) {
  if (!workout?.plan) return null;
  const done = new Set(workout.exercises.map(block => block.exercise));
  return workout.plan.items.find(item => !done.has(item.exercise)) ?? null;
}

function startNextPlanExercise() {
  const next = nextPlanItem(activeWorkout);
  if (next && !activeWorkout.running) requestExercise(next.exercise);
}

function renderPlanExecution(workout) {
  const panel = document.getElementById('plan-execution');
  const next = nextPlanItem(workout);
  for (const card of cards.values()) {
    card.querySelector('.next-planned-exercise').hidden = !next || Boolean(workout?.running);
  }
  panel.hidden = !workout?.plan;
  const plannedSetDose = document.getElementById('planned-set-dose');
  const running = workout?.running;
  const current = workout?.plan?.items.find(item => item.exercise === running?.exercise);
  plannedSetDose.hidden = !current;
  if (current) plannedSetDose.textContent = 'Plán · ' + plannedDose(current);
  if (!workout?.plan) return;
  const done = new Set(workout.exercises.map(block => block.exercise));
  const completed = workout.plan.items.filter(item => done.has(item.exercise)).length;
  document.getElementById('plan-execution-name').textContent = workout.plan.name;
  document.getElementById('plan-execution-status').textContent =
    'Hotovo ' + completed + ' z ' + workout.plan.items.length + (next ? '' : ' · plán odcvičený');
  document.getElementById('start-next-plan').hidden = !next || Boolean(running);
  const list = document.getElementById('plan-execution-list');
  list.replaceChildren();
  for (const item of workout.plan.items) {
    const row = document.createElement('li');
    const meta = document.createElement('div');
    const dose = document.createElement('small');
    dose.textContent = plannedDose(item);
    meta.append(exerciseLink(item.exercise), dose);
    const state = done.has(item.exercise) ? 'Hotovo' : item.exercise === running?.exercise ? 'Prebieha' : 'Čaká';
    const status = document.createElement('small');
    status.textContent = state;
    row.append(meta, status);
    list.append(row);
  }
}

function startPlanWorkout(plan, startFirst = false) {
  if (activeWorkout) {
    planStatus.textContent = 'Jeden tréning už prebieha. Otvor ho v časti Tréning.';
    return;
  }
  if (!plan) return;
  activeWorkout = newWorkout(Date.now(), plan);
  persistWorkout();
  renderWorkout();
  planStatus.textContent = 'Plán spustený.';
  if (startFirst) startNextPlanExercise();
  else location.hash = 'teraz';
}

function selectedPresetDraft() {
  const preset = planPresets[Number(planPresetSelect.value)];
  return {...emptyPlan(), name:preset.name, items:preset.exercises.map(([id, sets]) => defaultPlanItem(id, sets))};
}

planName.addEventListener('input', () => { draft.name = planName.value; persistPlans(); });
planSearch.addEventListener('input', renderPlanPicks);
planGroup.addEventListener('change', renderPlanPicks);
planPresetSelect.addEventListener('change', () => {
  document.getElementById('plan-preset-description').textContent = planPresets[Number(planPresetSelect.value)].description;
});
document.getElementById('load-plan-preset').addEventListener('click', () => {
  openDraft(selectedPresetDraft());
  document.getElementById('plan-editor-title').scrollIntoView();
});
document.getElementById('load-saved-plan').addEventListener('click', () => {
  const selected = savedPlans.find(plan => plan.id === planSavedSelect.value);
  if (selected) {
    openDraft(selected);
    document.getElementById('plan-editor-title').scrollIntoView();
  } else planStatus.textContent = 'Vyber uložený plán.';
});
document.getElementById('new-plan-draft').addEventListener('click', () => { openDraft(emptyPlan()); planName.focus(); });
document.getElementById('save-plan').addEventListener('click', () => saveDraft(false));
document.getElementById('duplicate-plan').addEventListener('click', () => saveDraft(true));
document.getElementById('start-plan').addEventListener('click', () => startPlanWorkout(completePlanDraft()));
document.getElementById('start-plan-preset').addEventListener('click', () => {
  const plan = {...selectedPresetDraft(), id:planIdentity(), updatedAt:Date.now()};
  startPlanWorkout(plan, true);
});
document.getElementById('start-saved-plan').addEventListener('click', () => {
  startPlanWorkout(savedPlans.find(plan => plan.id === planSavedSelect.value), true);
});
planSavedSelect.addEventListener('change', () => {
  document.getElementById('start-saved-plan').disabled = !planSavedSelect.value;
});
document.getElementById('start-next-plan').addEventListener('click', startNextPlanExercise);
for (const card of cards.values()) card.querySelector('.next-planned-exercise').addEventListener('click', startNextPlanExercise);
coverageBase.addEventListener('load', () => paintMuscleMap(planCanvasContext, planCounts));

window.addEventListener('storage', event => {
  if (event.key !== planStorageKey || !event.newValue) return;
  try {
    loadPlanState(event.newValue);
    planName.value = draft.name;
    renderPlanner();
  } catch {
    planStatus.textContent = 'Zmeny plánu z druhého okna sa nepodarilo načítať.';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  for (const [index, preset] of planPresets.entries()) planPresetSelect.add(new Option(preset.name, index));
  planPresetSelect.dispatchEvent(new Event('change'));
  for (const group of groups) planGroup.add(new Option(group.dataset.group, group.id));
  planName.value = draft.name;
  renderPlanner();
});
