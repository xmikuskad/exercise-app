const comparisonPanel = document.getElementById('performance-comparison');
const comparisonLength = document.getElementById('comparison-length');
const comparisonMode = document.getElementById('comparison-mode');
const comparisonSide = document.getElementById('comparison-side');
const comparisonBenchmark = document.getElementById('comparison-benchmark');
const comparisonStatus = document.getElementById('comparison-status');
const comparisonNumber = new Intl.NumberFormat('sk-SK', {maximumFractionDigits:2});
const comparisonDifference = new Intl.NumberFormat('sk-SK', {maximumFractionDigits:2, signDisplay:'exceptZero'});
let comparedExercise = '';

function comparisonPeriods(days, now = new Date()) {
  const midnight = offset => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return [
    {name:'previous', start:midnight(1 - days * 2), end:midnight(1 - days), last:midnight(-days)},
    {name:'recent', start:midnight(1 - days), end:midnight(1), last:midnight(0)},
  ];
}

function periodBestSets(sets, compareWeight, allowUnweighted, assistance) {
  const best = new Map();
  for (const set of sets) {
    if (set.weight === null && (compareWeight || !allowUnweighted)) continue;
    const benchmark = compareWeight ? set.amount : set.weight ?? 'unweighted';
    const value = compareWeight ? set.weight : set.amount;
    const previous = best.get(benchmark);
    if (previous === undefined || (compareWeight && assistance ? value < previous : value > previous)) {
      best.set(benchmark, value);
    }
  }
  return best;
}

function renderPeriodComparison(id, readings) {
  comparisonPanel.hidden = !id;
  if (!id) return;
  const card = cards.get(id);
  const seconds = card.dataset.setUnit === 'seconds';
  const assistance = card.dataset.loadBasis === 'assistance';
  const oneSide = card.dataset.perSide === 'yes';
  const unweighted = card.dataset.equipment === 'bodyweight';
  const periods = comparisonPeriods(Number(comparisonLength.value)).map(period => ({
    ...period,
    sets:readings.filter(({date}) => date >= period.start && date < period.end).flatMap(({sets}) => sets),
  }));
  const sides = new Set(periods.flatMap(({sets}) => sets.map(set => set.side ?? 'both')));
  document.getElementById('comparison-side-field').hidden = !oneSide;
  for (const option of comparisonSide.options) option.disabled = sides.size > 0 && !sides.has(option.value);
  if (oneSide && !sides.has(comparisonSide.value)) {
    comparisonSide.value = sides.has('both') ? 'both' : sides.values().next().value ?? 'both';
  }
  const eligible = periods.map(({sets}) => oneSide
    ? sets.filter(set => (set.side ?? 'both') === comparisonSide.value) : sets);
  const hasWeight = eligible.some(sets => sets.some(set => set.weight !== null));
  document.getElementById('comparison-mode-field').hidden = seconds || !hasWeight;
  comparisonMode.options[0].textContent = assistance
    ? 'Dopomoc pri rovnakých opakovaniach' : 'Váhu pri rovnakých opakovaniach';
  const compareWeight = !seconds && hasWeight && comparisonMode.value === 'weight';
  const best = eligible.map(sets => periodBestSets(sets, compareWeight, unweighted, assistance));
  const candidates = [...new Set(best.flatMap(values => [...values.keys()]))].sort((a, b) => {
    const shared = key => Number(best.every(values => values.has(key)));
    return shared(b) - shared(a) || Number(b === 'unweighted') - Number(a === 'unweighted') ||
      Number(b) - Number(a);
  });
  const previousSelection = comparedExercise === id ? comparisonBenchmark.value : '';
  comparedExercise = id;
  comparisonBenchmark.replaceChildren();
  comparisonBenchmark.disabled = !candidates.length;
  document.getElementById('comparison-benchmark-label').textContent = compareWeight ? 'Počet opakovaní'
    : assistance ? 'Dopomoc' : unweighted && !hasWeight ? 'Záťaž' : 'Zapísaná váha';
  if (!candidates.length) comparisonBenchmark.add(new Option('Bez vhodných záznamov', ''));
  for (const candidate of candidates) {
    const label = candidate === 'unweighted' ? 'Bez zapísanej prídavnej váhy'
      : comparisonNumber.format(candidate) + (compareWeight ? ' opak.' : ' kg');
    comparisonBenchmark.add(new Option(label, String(candidate)));
  }
  if (candidates.some(key => String(key) === previousSelection)) comparisonBenchmark.value = previousSelection;
  const selected = comparisonBenchmark.value;
  const benchmark = selected === 'unweighted' ? selected : Number(selected);
  const unit = compareWeight ? 'kg' : seconds ? 's' : 'opak.';
  const values = best.map(results => selected ? results.get(benchmark) : undefined);
  periods.forEach((period, index) => {
    document.getElementById('comparison-' + period.name + '-dates').textContent =
      displayDate(today(period.start)) + ' – ' + displayDate(today(period.last));
    const value = values[index];
    document.getElementById('comparison-' + period.name).textContent =
      value === undefined ? '—' : comparisonNumber.format(value) + ' ' + unit;
  });
  if (values.every(value => value !== undefined)) {
    const delta = comparisonDifference.format(values[1] - values[0]);
    comparisonStatus.textContent = 'Rozdiel: ' + delta + ' ' + unit;
  } else if (!selected) {
    comparisonStatus.textContent = periods.some(period => period.sets.length)
      ? 'V týchto obdobiach chýba záznam záťaže vhodný na porovnanie.'
      : 'V týchto obdobiach zatiaľ nemáš zapísané série.';
  } else {
    comparisonStatus.textContent = 'Pre tento výber je výsledok iba v jednom období.';
  }
  document.getElementById('comparison-note').textContent = assistance
    ? 'Pri rovnakom stroji znamená nižšia dopomoc menšiu pomoc.'
    : seconds ? 'Porovnáva sa najdlhšia výdrž v rovnakej variante a so zvolenou záťažou.'
    : 'Porovnávajú sa najlepšie série. Pri strojoch používaj rovnaké nastavenie a stupnicu.';
}

comparisonLength.addEventListener('change', () => renderPerformance());
comparisonMode.addEventListener('change', () => {
  comparisonBenchmark.value = '';
  renderPerformance();
});
comparisonSide.addEventListener('change', () => {
  comparisonBenchmark.value = '';
  renderPerformance();
});
comparisonBenchmark.addEventListener('change', () => renderPerformance());
