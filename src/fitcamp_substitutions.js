const equipmentNames = {
  floor:'Podlaha / podložka',
  support:'Lavička / pevná opora',
  dumbbells:'Jednoručky',
  band:'Odporová guma',
  cable:'Kladka',
  machine:'Stroj',
};
const substitutionDialog = document.getElementById('exercise-substitutions');
const substitutionList = document.getElementById('substitution-choices');
const substitutionStatus = document.getElementById('substitution-status');
let substitutionTarget = null;

function equipmentFilter() {
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = 'Dostupné vybavenie';
  const select = document.createElement('select');
  select.add(new Option('Všetko vybavenie', ''));
  for (const [kind, name] of Object.entries(equipmentNames)) select.add(new Option(name, kind));
  label.append(select);
  return {label, select};
}

const substitutionEquipment = equipmentFilter();
document.getElementById('substitution-equipment').append(substitutionEquipment.label);

function canReplaceSlot(workout, slot) {
  return Boolean(slot && !workout.exercises.some(block => block.exercise === slot.exercise) &&
    (workout.running?.exercise !== slot.exercise ||
      (!workout.running.sets.length && !readSetDraft().some(row => row.amount.trim() || row.weight.trim()))));
}

function renderExerciseSubstitutions() {
  if (!substitutionTarget) return;
  substitutionList.replaceChildren();
  const workout = activeWorkout;
  const original = cards.get(substitutionTarget.exercise);
  const slot = workout?.plan?.items.find(item => item.exercise === original.id);
  if (workout?.id !== substitutionTarget.workout || !slot ||
      workout.exercises.some(block => block.exercise === original.id)) {
    substitutionStatus.textContent = 'Tento cvik sa už v aktuálnom tréningu nedá vymeniť.';
    return;
  }
  if (!canReplaceSlot(workout, slot)) {
    substitutionStatus.textContent = 'Tento cvik už má rozpísané série. Dokonči ho a náhradu vyber pri ďalšom cviku.';
    return;
  }
  const occupied = new Set([...workout.plan.items, ...workout.exercises, workout.running].filter(Boolean).map(item => item.exercise));
  const targets = original.dataset.main.split(' ');
  const gear = substitutionEquipment.select.value;
  const matches = recommendationCards
    .filter(({card}) => !occupied.has(card.id) && (!gear || card.dataset.equipmentKind === gear))
    .map(candidate => ({...candidate, overlap:targets.filter(id => candidate.main.includes(id))}))
    .filter(candidate => candidate.overlap.length)
    .sort((a, b) => b.overlap.length - a.overlap.length ||
      Number(b.card.parentElement === original.parentElement) - Number(a.card.parentElement === original.parentElement) ||
      a.priority - b.priority);
  substitutionStatus.textContent = matches.length
    ? 'Počet sérií sa prenesie. Opakovania sa nastavia podľa náhrady. Zmena platí pre tento tréning.'
    : 'Pre tento výber sa nenašiel ďalší cvik s rovnakým hlavným svalom. Skús iné vybavenie.';
  for (const {card, overlap} of matches) {
    const row = document.createElement('li');
    const meta = document.createElement('div');
    const title = card.querySelector('.exercise-name').cloneNode(true);
    const description = document.createElement('small');
    description.textContent = equipmentNames[card.dataset.equipmentKind] + ' · ' + overlap.map(id => muscles[id]).join(', ');
    meta.append(title, description);
    const choose = makePlanButton('Použiť', () => {
      if (workout !== activeWorkout || !workout.plan.items.includes(slot) || !canReplaceSlot(workout, slot)) {
        renderExerciseSubstitutions();
        return;
      }
      const wasRunning = workout.running?.exercise === original.id;
      workout.plan = {...workout.plan, items:workout.plan.items.map(item =>
        item === slot ? defaultPlanItem(card.id, slot.sets) : item)};
      if (wasRunning) {
        workout.running = null;
        exerciseFeedback(original.id, '');
      }
      substitutionDialog.close();
      showWorkoutStatus('Náhrada · ' + exerciseNames.get(card.id));
      persistWorkout();
      renderWorkout();
      const focusReplacement = () => document.querySelector('#plan-execution-list li[data-exercise="' + card.id + '"] a')?.focus();
      if (location.hash === '#teraz') focusReplacement();
      else if (wasRunning) {
        window.addEventListener('hashchange', focusReplacement, {once:true});
        location.hash = 'teraz';
      }
    }, 'Použiť · ' + exerciseNames.get(card.id));
    choose.dataset.exercise = card.id;
    row.append(meta, choose);
    substitutionList.append(row);
  }
}

function openExerciseSubstitutions(exercise) {
  substitutionTarget = {workout:activeWorkout?.id, exercise};
  document.getElementById('substitution-original').textContent = exerciseNames.get(exercise);
  substitutionEquipment.select.value = '';
  renderExerciseSubstitutions();
  substitutionDialog.showModal();
}

substitutionEquipment.select.addEventListener('change', renderExerciseSubstitutions);
document.getElementById('swap-current-exercise').addEventListener('click', () => {
  if (activeWorkout?.running) openExerciseSubstitutions(activeWorkout.running.exercise);
});
