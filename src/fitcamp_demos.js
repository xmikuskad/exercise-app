const exerciseDemos = Array.from(document.querySelectorAll('.exercise-demo'));

function showDemo(demo, show) {
  const button = demo.querySelector('.demo-toggle');
  const motion = demo.querySelector('.demo-motion');
  const video = motion.querySelector('video');
  const stills = demo.querySelector('.demo-stills');
  if (stills) stills.hidden = show;
  motion.hidden = !show;
  button.setAttribute('aria-expanded', String(show));
  button.textContent = show ? (stills ? 'Späť na obrázky' : 'Skryť ukážku') : 'Prehrať ukážku';
  if (!show) {
    video.pause();
    return;
  }
  if (!video.hasAttribute('src')) video.src = video.dataset.src;
  if (video.readyState > 0) video.currentTime = 0;
  video.play().catch(() => {
    // The built-in play control stays available if autoplay is restricted.
  });
}

for (const demo of exerciseDemos) {
  const button = demo.querySelector('.demo-toggle');
  button.addEventListener('click', () => {
    const show = button.getAttribute('aria-expanded') === 'false';
    if (show) {
      for (const other of exerciseDemos) {
        if (other !== demo && !other.querySelector('.demo-motion').hidden) showDemo(other, false);
      }
    }
    showDemo(demo, show);
  });
  demo.closest('.card')?.addEventListener('toggle', event => {
    if (!event.currentTarget.open && !demo.querySelector('.demo-motion').hidden) showDemo(demo, false);
  });
}
