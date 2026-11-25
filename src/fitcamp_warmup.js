const warmup = JSON.parse(document.getElementById('warmup-data').textContent);
const warmupKey = appStorageKey('exehel-warmup-v1');
const warmupOptions = document.getElementById('warmup-options');
const warmupChoices = document.getElementById('warmup-choices');
const warmupGuide = document.getElementById('warmup-guide');
const warmupDemo = warmupGuide.querySelector('.exercise-demo');
const warmupVideo = warmupDemo.querySelector('video');
const warmupSource = document.getElementById('warmup-source');
const warmupFieldset = document.getElementById('warmup-fieldset');
const warmupImage = document.getElementById('warmup-image');
let openWarmupRow = null;
let openWarmupAction = null;
let warmupSelection = {};

try {
  const saved = JSON.parse(localStorage.getItem(warmupKey));
  if (saved && typeof saved === 'object' && !Array.isArray(saved)) warmupSelection = saved;
} catch {
  // Defaults still work when storage is unavailable.
}

function selectedWarmup(group) {
  const key = warmupSelection[group];
  if (key === '') return null;
  return warmup.groups[group].find(variant => variant.id === key) ?? warmup.groups[group][0];
}

function renderWarmupRow(row) {
  const variant = selectedWarmup(row.dataset.warmupGroup);
  row.querySelector('.warmup-selection').textContent = variant ? variant.name + ' · ' + variant.dose : 'Vynechané';
  row.querySelector('.warmup-info').disabled = !variant;
}

function stopWarmupDemo() {
  showDemo(warmupDemo, false);
  if (warmupVideo.hasAttribute('src')) {
    warmupVideo.removeAttribute('src');
    warmupVideo.load();
  }
}

function renderWarmupGuide(variant) {
  stopWarmupDemo();
  warmupGuide.hidden = !variant;
  if (!variant) return;
  const title = document.getElementById('warmup-guide-title');
  const english = document.createElement('small');
  english.lang = 'en';
  english.textContent = ' (' + variant.english + ')';
  title.replaceChildren(variant.name, english);
  document.getElementById('warmup-guide-dose').textContent = variant.dose + ' · ' + variant.equipment;
  document.getElementById('warmup-setup').textContent = variant.setup;
  document.getElementById('warmup-cue').textContent = variant.cue;
  document.getElementById('warmup-mistakes').textContent = variant.mistakes;
  const media = warmup.media[variant.id];
  const card = cards.get(variant.id);
  warmupVideo.dataset.src = media?.video ?? card.querySelector('video').dataset.src;
  warmupImage.src = media?.image ?? card.querySelector('.demo-stills img').src;
  warmupImage.alt = variant.name + '. Vľavo: ' + variant.labels[0] + '. Vpravo: ' + variant.labels[1] + '.';
  warmupDemo.querySelectorAll('.labels span').forEach((label, index) => { label.textContent = variant.labels[index]; });
  warmupVideo.setAttribute('aria-label', variant.name + ' · schematická ukážka');
  warmupSource.href = variant.url;
  warmupSource.querySelector('small').textContent = variant.source;
}

function closeWarmupOptions() {
  if (!openWarmupRow) return;
  openWarmupAction.setAttribute('aria-expanded', 'false');
  openWarmupRow = null;
  openWarmupAction = null;
  warmupOptions.hidden = true;
  stopWarmupDemo();
}

function openWarmupOptions(row, action) {
  const group = row.dataset.warmupGroup;
  const chosen = selectedWarmup(group)?.id ?? '';
  openWarmupRow = row;
  openWarmupAction = action;
  action.setAttribute('aria-expanded', 'true');
  warmupFieldset.hidden = action.classList.contains('warmup-info');
  document.getElementById('warmup-options-title').textContent = row.querySelector('strong').textContent;
  warmupChoices.replaceChildren();
  for (const variant of [...warmup.groups[group], {id:'', name:'Vynechať partiu'}]) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    const description = document.createElement('span');
    radio.type = 'radio';
    radio.name = 'warmup-variant';
    radio.value = variant.id;
    radio.checked = variant.id === chosen;
    description.textContent = variant.name;
    if (variant.id) {
      const english = document.createElement('small');
      english.lang = 'en';
      english.textContent = '(' + variant.english + ')';
      const meta = document.createElement('small');
      meta.textContent = variant.dose + ' · ' + variant.equipment;
      description.append(english, meta);
    }
    label.append(radio, description);
    warmupChoices.append(label);
  }
  renderWarmupGuide(selectedWarmup(group));
  row.append(warmupOptions);
  warmupOptions.hidden = false;
}

for (const row of document.querySelectorAll('[data-warmup-group]')) {
  renderWarmupRow(row);
  for (const button of row.querySelectorAll('button')) {
    button.setAttribute('aria-controls', 'warmup-options');
    button.addEventListener('click', () => {
      const opening = openWarmupAction !== button;
      closeWarmupOptions();
      if (opening) openWarmupOptions(row, button);
    });
  }
}
warmupChoices.addEventListener('change', event => {
  const group = openWarmupRow.dataset.warmupGroup;
  warmupSelection[group] = event.target.value;
  try {
    localStorage.setItem(warmupKey, JSON.stringify(warmupSelection));
  } catch {
    // The active selection stays available for this visit.
  }
  renderWarmupRow(openWarmupRow);
  renderWarmupGuide(selectedWarmup(group));
});
renderWarmupGuide(warmup.groups.ankles[0]);
window.addEventListener('hashchange', () => {
  if (location.hash !== '#rozc') closeWarmupOptions();
});
