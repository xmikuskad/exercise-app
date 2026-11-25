const appSections = Array.from(document.querySelectorAll('main > section'));
const appNav = Array.from(document.querySelectorAll('.app-nav a'));
const catalog = document.getElementById('cviky');
const catalogBack = document.getElementById('catalog-back');
const resumeWorkout = document.getElementById('resume-workout');
const startPanel = document.getElementById('workout-start-panel');
let viewedCard = null;
let screenId = 'teraz';

function routeApp() {
  const hash = location.hash === '#arms' ? 'biceps-group' : location.hash.slice(1);
  const target = document.getElementById(hash);
  const screen = target?.closest('main > section') ?? appSections[0];
  screenId = screen.id;
  viewedCard?.classList.remove('view-exercise');
  viewedCard = target?.closest('.card') ?? null;
  viewedCard?.classList.add('view-exercise');
  catalog.classList.toggle('exercise-view', Boolean(viewedCard));
  for (const section of appSections) section.hidden = section !== screen;
  if (viewedCard) {
    if (viewedCard.hidden) {
      search.value = '';
      filterCards();
    }
    viewedCard.open = true;
  }
  if (target?.matches('.category,.card,.set-log-slot')) openTarget();
  else if (target && target !== screen) target.scrollIntoView({block:'start'});
  else window.scrollTo(0, 0);
  updateAppWorkout();
}

function updateAppWorkout() {
  const running = activeWorkout?.running;
  const insideWorkout = Boolean(running && viewedCard?.id === running.exercise);
  const navPage = ['pokrytie','sprava-dat','historia-trening','vykony','tyzdne'].includes(screenId) ? 'dennik'
    : insideWorkout || ['rozc','treningy','progres','pomoc','anatomia'].includes(screenId) ? 'teraz' : screenId;
  for (const link of appNav) {
    if (link.hash === '#' + navPage) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  startPanel.hidden = Boolean(activeWorkout);
  appSections[0].toggleAttribute('data-active', Boolean(activeWorkout));
  document.getElementById('free-workout-status').hidden = !activeWorkout || Boolean(activeWorkout.plan);
  resumeWorkout.hidden = !activeWorkout;
  dockButton.hidden = !activeWorkout;
  resumeWorkout.href = running ? '#' + running.exercise : '#teraz';
  resumeWorkout.textContent = running ? 'Späť k cviku' : 'Tréning';
  document.getElementById('warmup-done').href = resumeWorkout.hash;
  catalogBack.href = activeWorkout ? '#teraz' : '#cviky';
  catalogBack.textContent = activeWorkout ? '← Tréning' : '← Všetky cviky';
}

document.getElementById('start-free-workout').addEventListener('click', () => {
  if (activeWorkout) return;
  activeWorkout = newWorkout(Date.now());
  persistWorkout();
  renderWorkout();
  document.getElementById('workout-pick').focus();
});

catalog.addEventListener('click', event => {
  const summary = event.target.closest('.card > summary');
  if (!summary) return;
  event.preventDefault();
  const card = summary.parentElement;
  if (card !== viewedCard) location.hash = card.id;
});
window.addEventListener('hashchange', routeApp);
document.addEventListener('exehel:workout', updateAppWorkout);
document.body.classList.add('app-ready');
routeApp();
