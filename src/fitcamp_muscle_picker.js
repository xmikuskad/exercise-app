function attachMusclePicker(canvas, context, getCounts, getBlocks, onLink) {
  const panel = document.createElement('div');
  panel.className = 'muscle-picker';
  const label = document.createElement('label');
  label.className = 'field';
  label.textContent = 'Vyber sval na postave alebo v zozname';
  const picker = document.createElement('select');
  picker.add(new Option('Vyber sval', ''));
  for (const id of Object.keys(muscles).sort((a, b) => muscles[a].localeCompare(muscles[b], 'sk'))) {
    picker.add(new Option(muscles[id], id));
  }
  const overview = document.createElement('p');
  overview.className = 'subtle';
  overview.setAttribute('role', 'status');
  const list = document.createElement('ul');
  label.append(picker);
  panel.append(label, overview, list);
  canvas.closest('figure').after(panel);
  canvas.classList.add('interactive-map');
  const regions = Array.from(surfaceRegions).reverse();

  function renderSelection() {
    const target = picker.value;
    list.replaceChildren();
    if (!target) {
      overview.textContent = '';
      return;
    }
    const count = getCounts().get(target);
    const direct = count?.main ?? 0;
    const support = count?.secondary ?? 0;
    let text = direct + '× priamo · ' + support + '× pomocne';
    if (getBlocks && direct) {
      const blocks = getBlocks().filter(block => cards.get(block.exercise).dataset.main.split(' ').includes(target));
      const logged = blocks.reduce((total, block) => total + block.sets.length, 0);
      const last = Math.max(...blocks.map(block => block.finishedAt));
      text += ' · Priame zapísané série: ' + logged;
      if (Number.isFinite(last)) text += ' · Naposledy priamo: ' + displayDate(today(new Date(last)));
    }
    if (canvas === historyContext.canvas) {
      const lastWorkout = workoutHistory.find(workout => workout.exercises.some(block =>
        cards.get(block.exercise).dataset.main.split(' ').includes(target)));
      if (lastWorkout) {
        text += ' · Posledný priamy tréning v histórii: ' + displayDate(today(new Date(lastWorkout.startedAt)));
      } else {
        text += ' · V histórii zatiaľ bez priameho tréningu';
      }
    }
    const matches = recommendationCards.filter(item => item.main.includes(target))
      .sort((a, b) => a.priority - b.priority);
    overview.textContent = text + (matches.length ? '' : ' · V katalógu zatiaľ chýba priamy cvik.');
    for (const {card} of matches) {
      const entry = document.createElement('li');
      const link = exerciseLink(card.id);
      if (onLink) link.addEventListener('click', onLink);
      entry.append(link);
      list.append(entry);
    }
  }

  canvas.addEventListener('click', event => {
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * canvas.width / bounds.width;
    const y = (event.clientY - bounds.top) * canvas.height / bounds.height;
    const hit = regions.find(([, paths]) => paths.some(path => context.isPointInPath(path, x, y)));
    if (hit) {
      picker.value = hit[0];
      renderSelection();
    }
  });
  picker.addEventListener('change', renderSelection);
  canvas.addEventListener('exehel:map', renderSelection);
}

attachMusclePicker(coverageCanvas, coverageCanvasContext, () => completedCoverage, () =>
  (activeWorkout ?? workoutHistory.find(workout => workout.id === selectedArchive) ?? workoutHistory[0])?.exercises ?? [],
  () => coverageDialog.close());
attachMusclePicker(historyContext.canvas, historyContext, () => historicalRoles, () =>
  workoutHistory.filter(workout => selectedWorkoutIds.has(workout.id)).flatMap(workout => workout.exercises));
attachMusclePicker(planCanvasContext.canvas, planCanvasContext, () => planCounts);
