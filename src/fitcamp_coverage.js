const coverageData = JSON.parse(document.getElementById('coverage-data').textContent);
const coverageCanvas = document.getElementById('coverage-canvas');
const coverageCanvasContext = coverageCanvas.getContext('2d');
const dockButton = document.getElementById('live-map-dock');
const dockCanvas = document.getElementById('live-map-dock-canvas');
const dockContext = dockCanvas.getContext('2d');
const coverageBase = new Image();
const coverageDialog = document.getElementById('coverage-dialog');
const coverageView = document.getElementById('live-map-view');
const coverageHome = document.getElementById('live-map-host');
const coverageDialogHost = document.getElementById('coverage-dialog-host');
const coverageStatus = document.getElementById('coverage-status');
const surfaceRegions = new Map();
const groupTargets = {
  quads:['quad'], posterior:['gmax','gmed','ham'], calves:['gast','soleus'],
  pushes:['pec'], pulls:['lat','rhomb','trap'],
  shoulders:['dfront','dside','drear'], 'biceps-group':['biceps','brach','brad'],
  'triceps-group':['triceps'], core:['rectus','oblique','trans','erector','multif','ql'],
};
let completedCoverage = new Map();
let previewCoverage = new Set();

for (const [muscle, vertices] of coverageData.regions) {
  const path = new Path2D();
  path.moveTo(...vertices[0]);
  for (const point of vertices.slice(1)) path.lineTo(...point);
  path.closePath();
  if (!surfaceRegions.has(muscle)) surfaceRegions.set(muscle, []);
  surfaceRegions.get(muscle).push(path);
}

function createCoverageParts(container, onClick) {
  return groups.map(group => {
    const targets = groupTargets[group.id];
    const link = document.createElement('a');
    link.href = '#' + group.id;
    link.textContent = group.dataset.group;
    if (onClick) link.addEventListener('click', onClick);
    container.append(link);
    return {targets, link};
  });
}

function updateCoverageParts(parts, counts) {
  for (const {targets, link} of parts) {
    const direct = targets.some(target => counts.get(target)?.main);
    const indirect = targets.some(target => counts.get(target)?.secondary);
    link.dataset.state = direct ? 'main' : indirect ? 'secondary' : 'none';
    link.setAttribute('aria-label', link.textContent + ' · ' +
      (direct ? 'hlavný sval' : indirect ? 'pomocný sval' : 'bez zapojenia'));
  }
}

const coverageParts = createCoverageParts(document.getElementById('coverage-parts'), () => {
  coverageDialog.close();
});

function paintMuscleMap(context, counts, preview = []) {
  if (!context || !coverageBase.naturalWidth) return;
  context.drawImage(coverageBase, 0, 0);
  for (const [muscle, paths] of surfaceRegions) {
    const count = counts.get(muscle);
    if (!count) continue;
    context.fillStyle = count.main ? coverageData.primary : coverageData.support;
    context.strokeStyle = '#eaf4f2';
    context.lineWidth = 1;
    for (const path of paths) {
      context.fill(path);
      context.stroke(path);
    }
  }
  context.strokeStyle = '#f0f5f3';
  context.lineWidth = 1;
  for (const line of coverageData.details) {
    context.beginPath();
    context.moveTo(...line[0]);
    for (const point of line.slice(1)) context.lineTo(...point);
    context.stroke();
  }
  context.strokeStyle = '#ad5f10';
  context.lineWidth = 3;
  for (const muscle of preview) {
    for (const path of surfaceRegions.get(muscle) ?? []) context.stroke(path);
  }
}

function paintCoverage() {
  paintMuscleMap(coverageCanvasContext, completedCoverage, previewCoverage);
  if (dockContext) dockContext.drawImage(coverageCanvas, 0, 0, dockCanvas.width, dockCanvas.height);
}

function renderCoverage(workout, counts, running) {
  completedCoverage = counts;
  const card = running ? cards.get(running.exercise) : null;
  previewCoverage = card
    ? new Set((card.dataset.main + ' ' + card.dataset.secondary).split(' ').filter(Boolean)) : new Set();
  document.getElementById('coverage-preview-key').hidden = !running;

  const main = Array.from(counts.values()).filter(count => count.main).length;
  const support = counts.size - main;
  const summary = workout?.finishedAt ? 'Ukončený tréning. ' : '';
  const extra = running ? ' Obrys označuje zapojenie v rozpracovanom cviku.' : '';
  const text = workout ? summary + main + ' priamo · ' + support + ' len pomocne.' + extra
    : 'Začni tréning. Mapa sa bude meniť pri spustení a dokončení cvikov.';
  if (coverageStatus.textContent !== text) coverageStatus.textContent = text;
  document.getElementById('live-map-dock-status').textContent = !workout ? 'Bez tréningu'
    : workout.finishedAt ? 'História · ' + main + ' priamo' : main + ' priamo · ' + support + ' pomocne';
  updateCoverageParts(coverageParts, counts);
  const missing = Object.keys(muscles).filter(id => !counts.has(id));
  document.getElementById('coverage-missing-list').textContent =
    missing.length ? missing.map(id => muscles[id]).join(' · ') : 'V mape má záznam každý sledovaný sval.';
  paintCoverage();
}

dockButton.addEventListener('click', () => {
  if (coverageDialog.open) return;
  coverageDialogHost.append(coverageView);
  coverageDialog.showModal();
  paintCoverage();
});
coverageDialog.addEventListener('close', () => coverageHome.append(coverageView));
coverageBase.addEventListener('load', paintCoverage);
coverageBase.src = coverageData.base;
