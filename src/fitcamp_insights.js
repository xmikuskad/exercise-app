const historyWorkouts = document.getElementById('history-workouts');
const historyWorkoutDetail = document.getElementById('history-workout-detail');
const templateButton = document.getElementById('save-workout-template');
const templateStatus = document.getElementById('workout-template-status');
const performancePick = document.getElementById('performance-exercise');
let viewedWorkoutId = null;
let renderedWorkoutHistory = null;
let savedHistoryTemplate = null;

function renderHistoryWorkoutDetail() {
  const workout = workoutHistory.find(workout => workout.id === viewedWorkoutId) ?? workoutHistory[0];
  historyWorkoutDetail.replaceChildren();
  templateStatus.replaceChildren();
  templateButton.hidden = !workout;
  templateButton.disabled = savedHistoryTemplate === workout?.id;
  document.getElementById('history-workout-title').textContent = workout?.plan?.name ?? 'Ukončený tréning';
  if (!workout) {
    historyWorkoutDetail.textContent = 'Po ukončení prvého tréningu tu uvidíš jeho cviky a série.';
    return;
  }
  viewedWorkoutId = workout.id;
  const date = document.createElement('p');
  date.textContent = displayDate(today(new Date(workout.startedAt)));
  const list = document.createElement('ol');
  list.className = 'work-items';
  for (const block of workout.exercises) {
    const row = document.createElement('li');
    const values = document.createElement('p');
    values.className = 'subtle';
    values.textContent = block.sets.map(set => formatSet(set, block.exercise)).join(' · ') || 'Bez rozpísaných sérií';
    row.append(exerciseLink(block.exercise), values);
    list.append(row);
  }
  historyWorkoutDetail.append(date, list);
}

templateButton.addEventListener('click', () => {
  const workout = workoutHistory.find(workout => workout.id === viewedWorkoutId);
  if (!workout) return;
  const seriesByExercise = new Map();
  for (const block of workout.exercises) {
    seriesByExercise.set(block.exercise, (seriesByExercise.get(block.exercise) ?? 0) + block.sets.length);
  }
  const plan = decodePlan({
    id:planIdentity(),
    name:((workout.plan?.name ?? 'Tréning ' + displayDate(today(new Date(workout.startedAt)))) + ' · šablóna').slice(0, 70),
    updatedAt:Date.now(),
    items:Array.from(seriesByExercise, ([id, series]) => {
      const planned = workout.plan?.items.find(item => item.exercise === id);
      return {...defaultPlanItem(id), ...planned, sets:Math.min(12, series || planned?.sets || 1)};
    }),
  });
  if (!storePlan(plan)) {
    templateStatus.textContent = 'Prehliadač nepovolil uloženie šablóny.';
    return;
  }
  savedHistoryTemplate = workout.id;
  templateButton.disabled = true;
  const edit = document.createElement('a');
  edit.href = '#plan-editor-title';
  edit.textContent = 'Otvoriť šablónu v Plánoch';
  edit.addEventListener('click', () => openDraft(plan));
  templateStatus.append('Šablóna uložená. ', edit);
});

function renderPerformance() {
  const caption = document.getElementById('performance-caption');
  const list = document.getElementById('performance-data');
  list.replaceChildren();
  const id = performancePick.value;
  if (!id) {
    caption.textContent = 'Vývoj uvidíš po zapísaní sérií a ukončení tréningu.';
    return;
  }
  const readings = workoutHistory.flatMap(workout => {
    const sets = workout.exercises.filter(block => block.exercise === id).flatMap(block => block.sets);
    return sets.length ? [{date:workout.startedAt, sets}] : [];
  }).slice(0, 12).reverse();
  const seconds = cards.get(id).dataset.setUnit === 'seconds';
  const hasWeight = !seconds && readings.some(({sets}) => sets.some(set => set.weight > 0));
  const unit = seconds ? 's' : hasWeight ? 'kg' : 'opak.';
  const assistance = hasWeight && cards.get(id).dataset.loadBasis === 'assistance';
  caption.textContent = hasWeight
    ? assistance ? 'Najnižšia zapísaná dopomoc v návšteve. Pri rovnakom stroji porovnávaj aj opakovania.'
      : 'Najvyššia zapísaná váha v návšteve. Porovnávaj pri rovnakom vybavení a spolu s opakovaniami.'
    : seconds ? 'Najdlhšia zapísaná výdrž v návšteve.' : 'Najviac zapísaných opakovaní v jednej sérii.';
  const metric = sets => hasWeight
    ? (assistance ? sets.filter(set => set.weight !== null).reduce((min, set) => Math.min(min, set.weight), Infinity)
      : Math.max(...sets.map(set => set.weight ?? -1)))
    : Math.max(...sets.map(set => set.amount));
  const metrics = readings.map(({sets}) => metric(sets));
  const upper = Math.max(1, ...metrics.filter(Number.isFinite));
  const numbers = new Intl.NumberFormat('sk-SK', {maximumFractionDigits:2});
  readings.forEach(({date, sets}, index) => {
    const row = document.createElement('li');
    const header = document.createElement('div');
    const time = document.createElement('span');
    const amount = document.createElement('strong');
    const values = document.createElement('small');
    const value = metrics[index];
    time.textContent = displayDate(today(new Date(date)));
    amount.textContent = Number.isFinite(value) && value >= 0 ? numbers.format(value) + ' ' + unit : 'Bez uvedenej váhy';
    header.append(time, amount);
    row.append(header);
    if (Number.isFinite(value) && value >= 0) {
      const bar = document.createElement('progress');
      bar.max = upper;
      bar.value = value;
      bar.setAttribute('aria-hidden', 'true');
      row.append(bar);
    }
    values.textContent = sets.map(set => formatSet(set, id)).join(' · ');
    row.append(values);
    list.append(row);
  });
}

function refreshWorkoutInsights() {
  if (renderedWorkoutHistory === workoutHistory) return;
  renderedWorkoutHistory = workoutHistory;
  const list = document.createElement('ul');
  list.className = 'history-workout-list';
  for (const workout of workoutHistory) {
    const row = document.createElement('li');
    const button = document.createElement('button');
    const details = document.createElement('small');
    button.type = 'button';
    button.className = 'history-workout';
    button.textContent = workout.plan?.name ?? 'Voľný tréning';
    details.textContent = displayDate(today(new Date(workout.startedAt))) + ' · ' + workTime.format(workout.startedAt);
    button.append(details);
    button.addEventListener('click', () => {
      viewedWorkoutId = workout.id;
      renderHistoryWorkoutDetail();
      location.hash = 'historia-trening';
    });
    row.append(button);
    list.append(row);
  }
  historyWorkouts.replaceChildren(workoutHistory.length ? list : 'Ukončené tréningy sa zobrazia tu.');
  renderHistoryWorkoutDetail();
  const selected = performancePick.value;
  const logged = new Set(workoutHistory.flatMap(workout => workout.exercises.filter(block => block.sets.length).map(block => block.exercise)));
  performancePick.replaceChildren(new Option(logged.size ? 'Vyber cvik' : 'Zatiaľ bez sérií', ''));
  performancePick.disabled = !logged.size;
  for (const id of logged) performancePick.add(new Option(exerciseNames.get(id), id));
  performancePick.value = logged.has(selected) ? selected : logged.values().next().value ?? '';
  renderPerformance();
}

performancePick.addEventListener('change', renderPerformance);
document.addEventListener('exehel:workout', refreshWorkoutInsights);
refreshWorkoutInsights();
