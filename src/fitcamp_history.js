const historyChoices = document.getElementById('history-checks');
const historyStatus = document.getElementById('history-coverage-status');
const historyContext = document.getElementById('history-muscle-canvas').getContext('2d');
const bodyweightFilter = document.getElementById('history-bodyweight');
let coverageHistory = null;
let selectedWorkoutIds = new Set();
let recentWorkoutCount = 2;
let historicalRoles = new Map();

const recommendationCards = Array.from(cards.values()).map(card => ({
  card,
  main:card.dataset.main.split(' '),
  priority:card.querySelector('.priority.base') ? 0 : card.querySelector('.priority.alternative') ? 1 : 2,
}));
const groupedTargets = new Set(Object.values(groupTargets).flat());

function paintHistoryCoverage() {
  paintMuscleMap(historyContext, historicalRoles);
}

function renderHistoryRecommendations() {
  const surface = document.getElementById('history-recommendations');
  surface.replaceChildren();
  const eligible = recommendationCards.filter(({card}) => !bodyweightFilter.checked || card.dataset.equipment === 'bodyweight');
  const recommendationGroups = [
    ...groups.map(group => [group.dataset.group, groupTargets[group.id]]),
    ['Ďalšie sledované svaly', Object.keys(muscles).filter(target => !groupedTargets.has(target))],
  ];
  for (const [groupName, targets] of recommendationGroups) {
    const missing = targets.filter(target => !historicalRoles.get(target)?.main);
    if (!missing.length) continue;
    const panel = document.createElement('details');
    panel.className = 'history-recommendation';
    const title = document.createElement('summary');
    title.textContent = groupName + ' · ' + missing.length + ' bez priameho cviku';
    const focus = document.createElement('p');
    focus.textContent = missing.map(target => muscles[target] +
      (historicalRoles.has(target) ? ' (len pomocne)' : ' (bez záznamu)')).join(' · ');
    const list = document.createElement('ul');
    const selected = new Set();
    for (const target of missing) {
      const matches = eligible.filter(candidate => candidate.main.includes(target))
        .sort((a, b) => a.priority - b.priority ||
          b.main.filter(muscle => missing.includes(muscle)).length - a.main.filter(muscle => missing.includes(muscle)).length);
      for (const {card, main} of matches.slice(0, 2)) {
        if (selected.has(card.id)) continue;
        selected.add(card.id);
        const option = document.createElement('li');
        const note = document.createElement('small');
        note.textContent = 'Pokrýva z chýbajúcich svalov · ' + main.filter(id => missing.includes(id)).map(id => muscles[id]).join(', ');
        option.append(exerciseLink(card.id), note);
        list.append(option);
      }
    }
    const withoutOption = missing.filter(target => !eligible.some(candidate => candidate.main.includes(target)));
    panel.append(title, focus);
    if (list.children.length) panel.append(list);
    if (withoutOption.length) {
      const empty = document.createElement('p');
      empty.className = 'subtle';
      empty.textContent = 'Bez priameho cviku v tomto výbere · ' + withoutOption.map(target => muscles[target]).join(', ');
      panel.append(empty);
    }
    surface.append(panel);
  }
  if (!surface.children.length) surface.textContent = 'Každý sledovaný cieľ hlavných partií má vo výbere priamy cvik.';
}

function renderHistoryCoverage() {
  const selected = workoutHistory.filter(workout => selectedWorkoutIds.has(workout.id));
  const blocks = selected.flatMap(workout => workout.exercises);
  historicalRoles = roleCounts(blocks);
  document.getElementById('history-results').hidden = !selected.length;
  for (const [elementId, count] of recentButtons) {
    document.getElementById(elementId).setAttribute('aria-pressed', String(recentWorkoutCount === count));
  }
  historyStatus.textContent = selected.length
    ? 'Vybrané tréningy · ' + selected.length + ' | Záznamy cvikov · ' + blocks.length
    : workoutHistory.length ? 'Vyber aspoň jeden tréning.' : 'Porovnanie bude k dispozícii po ukončení prvého tréningu.';
  if (!selected.length) return;
  const missing = Object.keys(muscles).filter(id => !historicalRoles.has(id));
  const direct = Array.from(historicalRoles.values()).filter(count => count.main).length;
  document.getElementById('history-counts').textContent = direct + ' priamo · ' +
    (historicalRoles.size - direct) + ' len pomocne · ' + missing.length + ' bez záznamu';
  document.getElementById('history-missing-list').textContent =
    missing.map(id => muscles[id]).join(' · ') || 'Každý sledovaný sval má záznam.';
  paintHistoryCoverage();
  renderHistoryRecommendations();
}

function refreshHistoryChoices(force = false) {
  if (!force && coverageHistory === workoutHistory) return;
  coverageHistory = workoutHistory;
  if (recentWorkoutCount) {
    selectedWorkoutIds = new Set(workoutHistory.slice(0, recentWorkoutCount).map(workout => workout.id));
  }
  document.getElementById('history-choices').hidden = !workoutHistory.length;
  historyChoices.replaceChildren();
  for (const workout of workoutHistory) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = workout.id;
    checkbox.checked = selectedWorkoutIds.has(workout.id);
    checkbox.addEventListener('change', () => {
      recentWorkoutCount = 0;
      if (checkbox.checked) selectedWorkoutIds.add(workout.id);
      else selectedWorkoutIds.delete(workout.id);
      renderHistoryCoverage();
    });
    label.append(checkbox, displayDate(today(new Date(workout.startedAt))) + ' · ' +
      workTime.format(workout.startedAt) + ' · ' + (workout.plan?.name ?? workout.exercises.length + ' cvikov'));
    historyChoices.append(label);
  }
  renderHistoryCoverage();
}

const recentButtons = [['history-last-two', 2], ['history-last-three', 3]];
for (const [elementId, count] of recentButtons) {
  document.getElementById(elementId).addEventListener('click', () => {
    recentWorkoutCount = count;
    refreshHistoryChoices(true);
  });
}
bodyweightFilter.addEventListener('change', renderHistoryRecommendations);
coverageBase.addEventListener('load', paintHistoryCoverage);
