/* ═══════════════════════════════════════════════════
   SCROLL-SCRUBBED VIDEO HERO
   Strategy: fetch whole video → blob URL → instant seeks
   ═══════════════════════════════════════════════════ */

const video      = document.getElementById('heroVideo');
const scrollHero = document.getElementById('scrollHero');
const heroTitle  = document.querySelector('.hero-headline');

/* ── Subtle load strip (replaces heavy overlay) ── */
const loadStrip = document.getElementById('heroLoadStrip');
const loadFill  = document.getElementById('heroLoadFill');

/* ── Seek state machine ── */
let targetTime   = 0;
let pendingSeek  = false;
let videoBlobReady = false;

video.addEventListener('seeked',  () => { pendingSeek = false; });
video.addEventListener('seeking', () => { pendingSeek = true; });

function trySeek() {
  if (!videoBlobReady || pendingSeek) return;
  if (Math.abs(video.currentTime - targetTime) < 0.016) return;
  video.currentTime = targetTime;
}

(function rafLoop() { trySeek(); requestAnimationFrame(rafLoop); })();

/* ── Set scroll-container height ── */
function applyScrollHeight() {
  const dur = video.duration;
  if (!isFinite(dur) || dur <= 0) return;
  scrollHero.style.height = Math.round(dur * 130 + window.innerHeight) + 'px';
}

/* ── Fetch entire video → blob URL (guarantees full seekability) ── */
fetch('timelapse.mp4')
  .then(res => {
    if (!res.ok) throw new Error(res.status);
    const total  = Number(res.headers.get('Content-Length')) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;

    function pump() {
      return reader.read().then(({ done, value }) => {
        if (done) return;
        chunks.push(value);
        loaded += value.byteLength;
        if (total > 0 && loadFill) loadFill.style.width = Math.round(loaded / total * 100) + '%';
        return pump();
      });
    }

    return pump().then(() => new Blob(chunks, { type: 'video/mp4' }));
  })
  .then(blob => {
    video.src = URL.createObjectURL(blob);
    video.load();
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = 0;
      videoBlobReady = true;
      applyScrollHeight();
      /* Fade video in over the static poster */
      loadFill.style.width = '100%';
      setTimeout(() => {
        video.classList.add('ready');
        loadStrip.classList.add('done');
      }, 200);
    }, { once: true });
  })
  .catch(() => {
    videoBlobReady = true;
    applyScrollHeight();
    video.classList.add('ready');
    loadStrip.classList.add('done');
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

    /* Subtle parallax on headline */
    if (heroTitle) {
      heroTitle.style.transform = `translateY(${progress * -30}px)`;
      heroTitle.style.opacity   = 1 - progress * 0.6;
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
