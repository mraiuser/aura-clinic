/* ═══════════════════════════════════════════════════
   SCROLL-SCRUBBED VIDEO HERO
   Approach: stream directly (no blob wait), play→pause
   decoder init so currentTime seeks work immediately
   ═══════════════════════════════════════════════════ */

const video      = document.getElementById('heroVideo');
const scrollHero = document.getElementById('scrollHero');
const heroTitle  = document.querySelector('.hero-headline');
const loadStrip  = document.getElementById('heroLoadStrip');
const loadFill   = document.getElementById('heroLoadFill');

let targetTime  = 0;
let pendingSeek = false;
let videoReady  = false;

/* ── Seek state machine (RAF loop, never overlaps) ── */
video.addEventListener('seeked',  () => { pendingSeek = false; });
video.addEventListener('seeking', () => { pendingSeek = true;  });

(function rafLoop() {
  if (videoReady && !pendingSeek) {
    const diff = Math.abs(video.currentTime - targetTime);
    if (diff > 0.016) video.currentTime = targetTime;
  }
  requestAnimationFrame(rafLoop);
})();

/* ── Set scroll height once duration is known ── */
function applyScrollHeight() {
  const dur = video.duration;
  if (!isFinite(dur) || dur <= 0) return;
  scrollHero.style.height = Math.round(dur * 130 + window.innerHeight) + 'px';
}

/* ── Stream video directly — no blob download wait ──
   play() forces the browser to decode the first frame,
   then we pause immediately so currentTime seeks work. ── */
video.src = 'timelapse.mp4';
video.load();

video.addEventListener('canplay', () => {
  applyScrollHeight();
  /* Init decoder: play a fraction then pause */
  video.play().then(() => {
    video.pause();
    video.currentTime = 0;
    videoReady = true;
    /* Fade video in over poster */
    video.classList.add('ready');
    if (loadStrip) loadStrip.classList.add('done');
  }).catch(() => {
    /* Autoplay blocked — still allow seeks */
    videoReady = true;
    video.classList.add('ready');
    if (loadStrip) loadStrip.classList.add('done');
  });
}, { once: true });

/* Progress fill while buffering */
video.addEventListener('progress', () => {
  if (!loadFill || !video.duration) return;
  try {
    const buf = video.buffered;
    if (buf.length) {
      const pct = Math.round((buf.end(buf.length - 1) / video.duration) * 100);
      loadFill.style.width = pct + '%';
    }
  } catch(e) {}
});

window.addEventListener('resize', applyScrollHeight, { passive: true });

/* ── Scroll handler ── */
function getProgress() {
  const rect  = scrollHero.getBoundingClientRect();
  const total = scrollHero.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -rect.top / total));
}

let scrollTicking = false;
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    scrollTicking = false;
    const progress = getProgress();
    const dur = video.duration;
    if (isFinite(dur) && dur > 0) targetTime = progress * dur;

    /* Subtle parallax on headline only */
    if (heroTitle) {
      heroTitle.style.transform = `translateY(${progress * -40}px)`;
      heroTitle.style.opacity   = String(Math.max(0, 1 - progress * 1.8));
    }
  });
}, { passive: true });


/* ═══════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════ */
const nav        = document.getElementById('nav');
const burger     = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

function updateNav() {
  const bottom = scrollHero.offsetTop + scrollHero.offsetHeight;
  nav.classList.toggle('scrolled', window.scrollY > bottom - window.innerHeight * 0.6);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

burger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => mobileMenu.classList.remove('open'))
);


/* ═══════════════════════════════════════════════════
   ACTIVE NAV LINK
   ═══════════════════════════════════════════════════ */
const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    document.querySelectorAll('.nav__link').forEach(l => l.classList.remove('active'));
    const a = document.querySelector(`.nav__link[href="#${e.target.id}"]`);
    if (a) a.classList.add('active');
  });
}, { threshold: 0.4 });
document.querySelectorAll('section[id]').forEach(s => secObs.observe(s));


/* ═══════════════════════════════════════════════════
   TESTIMONIAL SLIDER
   ═══════════════════════════════════════════════════ */
const track = document.getElementById('testimonialsTrack');
const cards = track.querySelectorAll('.testimonial-card');
const dots  = document.getElementById('tDots');
let current = 0;
const visibleCount = () => window.innerWidth < 680 ? 1 : 2;

function buildDots() {
  dots.innerHTML = '';
  const n = Math.ceil(cards.length / visibleCount());
  for (let i = 0; i < n; i++) {
    const d = document.createElement('button');
    d.className = 't-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Slide ${i + 1}`);
    d.addEventListener('click', () => goTo(i));
    dots.appendChild(d);
  }
}
function goTo(idx) {
  const n = Math.ceil(cards.length / visibleCount());
  current = Math.max(0, Math.min(idx, n - 1));
  track.style.transform = `translateX(-${current * visibleCount() * (cards[0].offsetWidth + 24)}px)`;
  dots.querySelectorAll('.t-dot').forEach((d, i) => d.classList.toggle('active', i === current));
}
document.getElementById('tNext').addEventListener('click', () => goTo(current + 1));
document.getElementById('tPrev').addEventListener('click', () => goTo(current - 1));
buildDots();
window.addEventListener('resize', () => { buildDots(); goTo(0); });


/* ═══════════════════════════════════════════════════
   SCROLL REVEAL
   ═══════════════════════════════════════════════════ */
document.querySelectorAll(
  '.tagline__inner,.tagline__feature,.stats__item,.project-card,' +
  '.portfolio__item,.testimonial-card,.banner__inner,.section-header,' +
  '.footer__brand,.footer__col'
).forEach((el, i) => {
  el.classList.add('reveal');
  if (i % 3 === 1) el.classList.add('reveal-delay-1');
  if (i % 3 === 2) el.classList.add('reveal-delay-2');
});
const revealObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));


/* ═══════════════════════════════════════════════════
   CONTACT FORM
   ═══════════════════════════════════════════════════ */
const ctaForm    = document.getElementById('ctaForm');
const ctaSuccess = document.getElementById('ctaSuccess');
ctaForm.addEventListener('submit', e => {
  e.preventDefault();
  ctaForm.style.cssText = 'opacity:0;transition:opacity .4s ease';
  setTimeout(() => {
    ctaForm.hidden = true;
    ctaSuccess.hidden = false;
    ctaSuccess.style.cssText = 'opacity:0;transition:opacity .5s ease';
    requestAnimationFrame(() => { ctaSuccess.style.opacity = '1'; });
  }, 400);
});
