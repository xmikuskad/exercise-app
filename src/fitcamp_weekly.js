const weeklyMuscle = document.getElementById('weekly-muscle');
const weeklyRows = document.getElementById('weekly-volume-rows');
const weeklyNote = document.getElementById('weekly-volume-note');
const weeklyGuidance = document.getElementById('weekly-volume-guidance');
const weeklyExercises = document.getElementById('weekly-volume-exercises');
const weeklyReview = document.getElementById('weekly-review');
const weeklyReviewMuscles = document.getElementById('weekly-review-muscles');
const weeklyNumber = new Intl.NumberFormat('sk-SK', {maximumFractionDigits:1});
const weeklyDate = new Intl.DateTimeFormat('sk-SK', {day:'numeric', month:'numeric'});
const directCatalogMuscles = new Set(recommendationCards.flatMap(exercise => exercise.main));
const weeklyReviewTargets = [...new Set(Object.values(groupTargets).flat())].filter(id => directCatalogMuscles.has(id));
let weeklyHistory = null;

function emptyMuscleVolume() {
  return {directSets:0, directVisits:0, supportingVisits:0, withoutSeries:0, overlapVisits:0};
}

function weeklyVolume(history, now = new Date()) {
  const monday = now.getDate() - (now.getDay() + 6) % 7;
  const midnight = offset => new Date(now.getFullYear(), now.getMonth(), monday + offset);
  const weeks = Array.from({length:5}, (_, index) => ({
    start:midnight(-index * 7), end:midnight(7 - index * 7), last:midnight(6 - index * 7),
    visits:0, muscles:new Map(),
  }));
  for (const workout of history) {
    const week = weeks.find(period => workout.startedAt >= period.start && workout.startedAt < period.end);
    if (!week || workout.startedAt > now) continue;
    week.visits++;
    const roles = roleCounts(workout.exercises);
    for (const [id, count] of roles) {
      if (!week.muscles.has(id)) week.muscles.set(id, emptyMuscleVolume());
      const stats = week.muscles.get(id);
      if (count.main) stats.directVisits++;
      else if (count.secondary) stats.supportingVisits++;
      if (count.main > overlapThreshold) stats.overlapVisits++;
    }
    for (const block of workout.exercises) {
      for (const id of cards.get(block.exercise).dataset.main.split(' ')) {
        const stats = week.muscles.get(id);
        stats.directSets += block.sets.length;
        if (!block.sets.length) stats.withoutSeries++;
      }
    }
  }
  return weeks;
}

function weeklyAssessment(weeks, id) {
  const latest = weeks[1];
  const stats = latest.muscles.get(id);
  if (!latest.visits) return {kind:'unlogged', label:'Bez tréningu v denníku'};
  if (!stats) return {kind:'missing', label:'Bez záznamu pre tento sval'};
  if (!stats.directVisits) return {kind:'support', label:'Len pomocne'};
  if (stats.withoutSeries) return {kind:'incomplete', label:'Neúplný počet sérií'};
  const baseline = weeks.slice(2).map(week => week.muscles.get(id))
    .filter(value => value?.directSets && !value.withoutSeries)
    .map(value => value.directSets)
    .sort((a, b) => a - b);
  if (baseline.length < 2) return {kind:'early', label:'Málo týždňov na porovnanie'};
  const middle = Math.floor(baseline.length / 2);
  const median = baseline.length % 2 ? baseline[middle] : (baseline[middle - 1] + baseline[middle]) / 2;
  return stats.directSets < median
    ? {kind:'lower', label:'Menej priamych sérií než zvyčajne', median, count:baseline.length}
    : {kind:'usual', label:'Aspoň toľko priamych sérií ako zvyčajne', median, count:baseline.length};
}

function showWeeklyMuscle(id) {
  weeklyMuscle.value = id;
  renderWeeklyVolume();
}

function renderWeeklyVolume() {
  weeklyHistory = workoutHistory;
  const weeks = weeklyVolume(workoutHistory);
  const id = weeklyMuscle.value;
  weeklyRows.replaceChildren();
  let overlaps = 0;
  weeks.forEach((week, index) => {
    const stats = week.muscles.get(id) ?? emptyMuscleVolume();
    overlaps += stats.overlapVisits;
    const row = document.createElement('li');
    const heading = document.createElement('div');
    const title = document.createElement('strong');
    const label = document.createElement('span');
    const meta = document.createElement('small');
    heading.className = 'week-heading';
    const dates = weeklyDate.format(week.start) + ' – ' + weeklyDate.format(week.last);
    title.textContent = index === 0 ? 'Tento týždeň' : dates;
    label.className = 'week-value';
    label.textContent = !week.visits || (stats.withoutSeries && !stats.directSets) ? '—'
      : stats.directSets + (stats.directSets === 1 ? ' priama séria' : stats.directSets >= 2 && stats.directSets <= 4 ? ' priame série' : ' priamych sérií');
    heading.append(title, label);
    row.append(heading);
    const coverage = !week.visits ? 'Bez tréningu v denníku' : stats.directVisits
      ? 'Tréningy s priamym cvikom · ' + stats.directVisits
      : stats.supportingVisits ? 'Tréningy len s pomocným zapojením · ' + stats.supportingVisits : 'Bez záznamu pre tento sval';
    meta.textContent = (index === 0 ? dates + ' · ' : '') + coverage;
    if (stats.withoutSeries) meta.textContent += ' · Priame cviky bez počtu sérií · ' + stats.withoutSeries;
    if (stats.overlapVisits) meta.textContent += ' · Tréningy s prekryvom · ' + stats.overlapVisits;
    row.append(meta);
    weeklyRows.append(row);
  });
  weeklyNote.textContent = (overlaps >= 2 ? 'Prekryv sa opakoval v ' + overlaps + ' tréningoch. ' : '') +
    'Prekryv znamená aspoň tri priame záznamy cvikov na ten istý sval v jednej návšteve.';

  weeklyExercises.replaceChildren();
  const assessment = weeklyAssessment(weeks, id);
  let message = 'Posledný ukončený týždeň · ' + assessment.label + '. ';
  if (assessment.count) {
    message += 'Medián priamych sérií za ' + assessment.count + ' predošlé týždne so zápisom · ' +
      weeklyNumber.format(assessment.median) + '. ';
  }
  const canSuggest = ['missing','support','lower'].includes(assessment.kind);
  const guidance = {
    unlogged:'Objem sa z tohto týždňa nedá posúdiť.',
    missing:'Ak chceš sval cielene precvičiť, môžeš zaradiť priamy cvik.',
    support:'Ak je sval prioritou, môžeš doplniť jeden priamy cvik.',
    incomplete:'Z dostupných údajov sa objem za tento týždeň nedá porovnať.',
    early:'Na porovnanie treba aspoň dva staršie týždne so zapísanými priamymi sériami.',
    lower:'Ak je sval stále prioritou, zváž návrat k svojmu bežnému objemu.',
    usual:'Tréning si môžeš rozložiť podľa plánu a regenerácie.',
  };
  weeklyGuidance.textContent = message + guidance[assessment.kind];
  if (canSuggest) {
    const matches = recommendationCards.filter(candidate => candidate.main.includes(id))
      .sort((a, b) => a.priority - b.priority).slice(0, 3);
    for (const {card} of matches) {
      const row = document.createElement('li');
      row.append(exerciseLink(card.id));
      weeklyExercises.append(row);
    }
  }

  weeklyReviewMuscles.replaceChildren();
  for (const target of weeklyReviewTargets) {
    const review = weeklyAssessment(weeks, target);
    if (!['missing','support','lower'].includes(review.kind)) continue;
    const row = document.createElement('li');
    const button = document.createElement('button');
    const status = document.createElement('small');
    button.type = 'button';
    button.textContent = muscles[target];
    status.textContent = review.label;
    button.append(status);
    button.addEventListener('click', () => {
      showWeeklyMuscle(target);
      weeklyMuscle.focus();
    });
    row.append(button);
    weeklyReviewMuscles.append(row);
  }
  weeklyReview.hidden = !weeklyReviewMuscles.children.length;
}

for (const id of Object.keys(muscles).sort((a, b) => muscles[a].localeCompare(muscles[b], 'sk'))) {
  weeklyMuscle.add(new Option(muscles[id], id));
}
weeklyMuscle.value = 'quad';
weeklyMuscle.addEventListener('change', renderWeeklyVolume);
document.addEventListener('exehel:workout', () => {
  if (weeklyHistory !== workoutHistory) renderWeeklyVolume();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#tyzdne') renderWeeklyVolume();
});
renderWeeklyVolume();
