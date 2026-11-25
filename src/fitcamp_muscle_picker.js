function muscleMapRepresentation(id) {
  if (!surfaceRegions.has(id)) return 'Iba v zozname';
  return coverageData.schematic.includes(id) ? 'Schématická oblasť' : 'Zakreslené na postave';
}

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
  list.className = 'exercise-options';
  const gear = equipmentFilter();
  gear.label.hidden = true;
  const draftFeedback = document.createElement('p');
  draftFeedback.className = 'subtle';
  draftFeedback.setAttribute('role', 'status');
  label.append(picker);
  panel.append(label, overview);
  const weeklyLink = document.createElement('a');
  if (canvas === historyContext.canvas) {
    weeklyLink.href = '#tyzdne';
    weeklyLink.textContent = 'Týždenný objem tohto svalu';
    weeklyLink.hidden = true;
    weeklyLink.addEventListener('click', () => showWeeklyMuscle(picker.value));
    panel.append(weeklyLink);
  }
  panel.append(gear.label, list, draftFeedback);
  canvas.closest('figure').after(panel);
  canvas.classList.add('interactive-map');
  const regions = Array.from(surfaceRegions).reverse();

  function renderSelection() {
    const target = picker.value;
    list.replaceChildren();
    gear.label.hidden = !target;
    weeklyLink.hidden = !target;
    if (!target) {
      overview.textContent = '';
      return;
    }
    const count = getCounts().get(target);
    const direct = count?.main ?? 0;
    const support = count?.secondary ?? 0;
    let text = muscleMapRepresentation(target) + ' · ' + direct + '× priamo · ' + support + '× pomocne';
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
    const available = recommendationCards.filter(item => item.main.includes(target));
    const matches = available.filter(({card}) => !gear.select.value || card.dataset.equipmentKind === gear.select.value)
      .sort((a, b) => a.priority - b.priority);
    overview.textContent = text + (matches.length ? ' · Priame cviky v katalógu · ' + available.length : available.length
      ? ' · S týmto vybavením tu nie je priamy cvik.' : ' · V katalógu iba pomocné zapojenie.');
    for (const {card} of matches) {
      const entry = document.createElement('li');
      const link = exerciseLink(card.id);
      const meta = document.createElement('div');
      const equipment = document.createElement('small');
      equipment.textContent = equipmentNames[card.dataset.equipmentKind];
      if (onLink) link.addEventListener('click', onLink);
      meta.append(link, equipment);
      const included = draft.items.some(item => item.exercise === card.id);
      const add = makePlanButton(included ? 'V návrhu' : 'Do návrhu', () => {
        const stored = addExerciseToDraft(card.id);
        renderSelection();
        gear.select.focus();
        draftFeedback.textContent = stored === true ? 'V návrhu plánu · ' + exerciseNames.get(card.id)
          : stored === false ? 'Cvik je v otvorenom návrhu. Prehliadač zmenu neuložil.' : 'Cvik už je v návrhu.';
      }, 'Pridať do návrhu plánu · ' + exerciseNames.get(card.id));
      add.disabled = included;
      entry.append(meta, add);
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
  function changeSelection() {
    draftFeedback.textContent = '';
    renderSelection();
  }
  picker.addEventListener('change', changeSelection);
  gear.select.addEventListener('change', changeSelection);
  canvas.addEventListener('exehel:map', renderSelection);
}

attachMusclePicker(coverageCanvas, coverageCanvasContext, () => completedCoverage, () =>
  (activeWorkout ?? workoutHistory.find(workout => workout.id === selectedArchive) ?? workoutHistory[0])?.exercises ?? [],
  () => coverageDialog.close());
attachMusclePicker(historyContext.canvas, historyContext, () => historicalRoles, () =>
  workoutHistory.filter(workout => selectedWorkoutIds.has(workout.id)).flatMap(workout => workout.exercises));
attachMusclePicker(planCanvasContext.canvas, planCanvasContext, () => planCounts);

const anatomyCatalog = document.getElementById('anatomy-catalog');
for (const id of Object.keys(muscles).sort((a, b) => muscles[a].localeCompare(muscles[b], 'sk'))) {
  const row = document.createElement('li');
  const summary = document.createElement('div');
  const title = document.createElement('strong');
  const coverage = document.createElement('small');
  const direct = recommendationCards.filter(item => item.main.includes(id)).sort((a, b) => a.priority - b.priority);
  const support = recommendationCards.filter(({card}) => card.dataset.secondary.split(' ').includes(id)).length;
  row.dataset.muscle = id;
  title.textContent = muscles[id];
  coverage.textContent = muscleMapRepresentation(id) + ' · ' + (direct.length ? 'Priame cviky · ' + direct.length
    : support ? 'V katalógu iba pomocne' : 'Zatiaľ bez cviku');
  summary.append(title, coverage);
  if (direct.length) {
    const example = exerciseLink(direct[0].card.id);
    example.className = 'anatomy-example';
    summary.append(example);
  }
  row.append(summary);
  anatomyCatalog.append(row);
}
