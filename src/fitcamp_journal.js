function appStorageKey(key) {
  if (location.protocol === 'file:') return key;
  const scope = location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return 'fitcamp:' + (scope || '/') + ':' + key;
}

const storageKey = appStorageKey('fitcamp-training-journal-v1');
const cards = new Map(Array.from(document.querySelectorAll('details.card'), card => [card.id, card]));
const groups = Array.from(document.querySelectorAll('.category'));
const search = document.getElementById('exercise-search');
const dateInput = document.getElementById('training-date');
const backupInput = document.getElementById('backup-file');
const journalStatus = document.getElementById('journal-status');
const recentItems = document.getElementById('recent-items');
const dateFormat = new Intl.DateTimeFormat('sk-SK', {day:'numeric', month:'numeric', year:'numeric', timeZone:'UTC'});

function today(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function displayDate(value) {
  return dateFormat.format(new Date(value));
}

function decodeBackup(text) {
  const backup = JSON.parse(text);
  if (backup?.version !== 1 || !backup.entries || typeof backup.entries !== 'object' || Array.isArray(backup.entries)) {
    throw new Error('Invalid backup format');
  }
  const validated = {};
  for (const [id, entry] of Object.entries(backup.entries)) {
    if (!cards.has(id)) continue;
    if (!entry || !isDate(entry.date) || typeof entry.note !== 'string' || !Number.isFinite(entry.savedAt)) {
      throw new Error('Invalid exercise record');
    }
    validated[id] = {date:entry.date, note:entry.note.slice(0,100), savedAt:entry.savedAt};
  }
  return validated;
}

function encodeBackup() {
  return JSON.stringify({version:1, entries});
}

dateInput.value = today();
dateInput.max = today();
let entries = {};
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) entries = decodeBackup(saved);
} catch {
  journalStatus.textContent = 'Miestne záznamy sa nepodarilo načítať. Ak máš zálohu, môžeš ju načítať tlačidlom.';
}

function persist() {
  try {
    localStorage.setItem(storageKey, encodeBackup());
    return true;
  } catch {
    journalStatus.textContent = 'Prehliadač nepovolil trvalé uloženie. Pred zatvorením stránky si stiahni zálohu.';
    return false;
  }
}

function renderJournal() {
  for (const [id, card] of cards) {
    const entry = entries[id];
    const last = card.querySelector('.last');
    last.hidden = !entry;
    last.textContent = entry ? `Naposledy ${displayDate(entry.date)}${entry.note ? ' · ' + entry.note : ''}` : '';
    card.querySelector('.edit').hidden = !entry || !card.querySelector('.edit-date').hidden;
  }
  const recent = Object.entries(entries)
    .sort(([, a], [, b]) => b.date.localeCompare(a.date) || b.savedAt - a.savedAt)
    .slice(0, 8);
  recentItems.replaceChildren();
  if (!recent.length) {
    const item = document.createElement('li');
    item.textContent = 'Zatiaľ nemáš označený žiadny cvik.';
    recentItems.append(item);
    return;
  }
  for (const [id, entry] of recent) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#' + id;
    link.textContent = cards.get(id).querySelector('.exercise-name').textContent;
    const time = document.createElement('time');
    time.dateTime = entry.date;
    time.textContent = displayDate(entry.date);
    item.append(link, time);
    recentItems.append(item);
  }
}

for (const [id, card] of cards) {
  const input = card.querySelector('.exercise-note');
  const status = card.querySelector('.log-output');
  const editDate = card.querySelector('.edit-date');
  const recordDate = editDate.querySelector('input');
  const save = card.querySelector('.track .save');
  const cancel = card.querySelector('.cancel');

  function stopEditing() {
    editDate.hidden = true;
    cancel.hidden = true;
    save.textContent = 'Označiť ako odcvičené';
    input.value = '';
  }

  save.addEventListener('click', () => {
    const selectedDate = editDate.hidden ? dateInput : recordDate;
    const date = selectedDate.value;
    if (!isDate(date) || date > today()) {
      status.textContent = 'Vyber platný dnešný alebo minulý dátum.';
      selectedDate.focus();
      return;
    }
    entries[id] = {date, note:input.value.trim(), savedAt:Date.now()};
    const stored = persist();
    status.textContent = stored
      ? `Zapísané na ${displayDate(date)}.`
      : `Označené na ${displayDate(date)} iba v otvorenej stránke. Stiahni si zálohu.`;
    if (stored) journalStatus.textContent = '';
    stopEditing();
    renderJournal();
  });
  card.querySelector('.edit').addEventListener('click', () => {
    const entry = entries[id];
    if (!entry) return;
    editDate.hidden = false;
    recordDate.value = entry.date;
    recordDate.max = today();
    input.value = entry.note;
    save.textContent = 'Uložiť úpravu';
    cancel.hidden = false;
    status.textContent = '';
    input.focus();
    renderJournal();
  });
  cancel.addEventListener('click', () => {
    stopEditing();
    status.textContent = '';
    renderJournal();
  });
}

function downloadJournalFile(contents, type, filename) {
  const url = URL.createObjectURL(new Blob([contents], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

document.getElementById('export-log').addEventListener('click', () => {
  const backup = {version:1, entries, workouts:workoutHistory, plans:savedPlans};
  downloadJournalFile(JSON.stringify(backup), 'application/json', 'exehel-zaloha-' + today() + '.json');
});

document.getElementById('import-log').addEventListener('click', () => backupInput.click());
backupInput.addEventListener('change', async () => {
  const file = backupInput.files[0];
  if (!file) return;
  try {
    if (file.size > 5000000) throw new Error('Backup too large');
    const text = await file.text();
    const incoming = decodeBackup(text);
    const packageData = JSON.parse(text);
    const workouts = decodeWorkoutHistory(packageData.workouts);
    const plans = decodePlans(packageData.plans);
    for (const [id, candidate] of Object.entries(incoming)) {
      const existing = entries[id];
      if (!existing || candidate.date > existing.date ||
          (candidate.date === existing.date && candidate.savedAt > existing.savedAt)) {
        entries[id] = candidate;
      }
    }
    const journalStored = persist();
    const workoutsStored = mergeWorkoutHistory(workouts);
    const plansStored = mergePlanLibrary(plans);
    if (journalStored && workoutsStored && plansStored) journalStatus.textContent = 'Záloha načítaná.';
    else journalStatus.textContent = 'Záloha je načítaná v otvorenej stránke. Prehliadač nepovolil trvalé uloženie všetkých údajov.';
    renderJournal();
  } catch {
    journalStatus.textContent = 'Súbor sa nepodarilo načítať. Vyber zálohu denníka vo formáte JSON.';
  } finally {
    backupInput.value = '';
  }
});

const normalize = text => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
const names = new Map(Array.from(cards, ([id, card]) => [id, normalize(
  card.querySelector('.exercise-name').textContent + ' ' +
  card.querySelector('.exercise-subtitle').textContent + ' ' + card.parentElement.dataset.group +
  ' ' + card.dataset.aliases
)]));

function filterCards() {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  for (const [id, card] of cards) {
    card.hidden = !terms.every(term => names.get(id).includes(term));
  }
  for (const group of groups) group.hidden = !group.querySelector('details.card:not([hidden])');
  document.getElementById('empty-search').hidden = groups.some(group => !group.hidden);
}

function openTarget() {
  const id = location.hash === '#arms' ? 'biceps-group' : location.hash.slice(1);
  const element = document.getElementById(id);
  if (!element?.matches('details.card, .category, .set-log-slot')) return;
  const card = element.closest('details.card');
  if (element.hidden || card?.hidden) {
    search.value = '';
    filterCards();
  }
  if (card) card.open = true;
  element.scrollIntoView({block:'start'});
}

search.addEventListener('input', filterCards);
window.addEventListener('hashchange', openTarget);
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (link && link.hash === location.hash) openTarget();
});
renderJournal();
openTarget();
window.addEventListener('storage', event => {
  if (event.key !== storageKey || !event.newValue) return;
  try {
    entries = decodeBackup(event.newValue);
    renderJournal();
  } catch {
    journalStatus.textContent = 'Záznamy z druhého okna sa nepodarilo načítať.';
  }
});
