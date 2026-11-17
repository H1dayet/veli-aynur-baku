const C = CONFIG;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');
const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const start = new Date(C.date);
const [y, mo, dd] = new Intl.DateTimeFormat('en-CA', { timeZone: C.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  .format(start).split('-').map(Number);
const dow = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
const dateDots = `${pad(dd)} · ${pad(mo)} · ${y}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// ponytail: month/weekday names hardcoded per language, so output never depends on the browser's Intl data
const ruPlural = new Intl.PluralRules('ru');
const RU_FORM = { one: 0, few: 1, many: 2, other: 2 };
const RU_UNITS = { d: ['день', 'дня', 'дней'], h: ['час', 'часа', 'часов'], m: ['минута', 'минуты', 'минут'], s: ['секунда', 'секунды', 'секунд'] };
const L = {
  ru: {
    weekdays: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
    wd: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    month: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
    monthNom: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    long: (w, d, m, yr) => `${cap(w)}, ${d} ${m} ${yr}`,
    unit: (k, v) => RU_UNITS[k][RU_FORM[ruPlural.select(+v)]],
  },
  az: {
    weekdays: ['bazar', 'bazar ertəsi', 'çərşənbə axşamı', 'çərşənbə', 'cümə axşamı', 'cümə', 'şənbə'],
    wd: ['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'],
    month: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
    get monthNom() { return this.month; },
    long: (w, d, m, yr) => `${d} ${m} ${yr}, ${w}`,
    unit: (k) => ({ d: 'gün', h: 'saat', m: 'dəqiqə', s: 'saniyə' })[k],   // Azerbaijani nouns don't change after numbers
  },
};

let lang = 'az';
let T = C.text.az;
$('#coverDate').textContent = dateDots;

// ---- Falling snow ----
// ponytail: 26 CSS-animated spans; canvas only if you want hundreds
const snow = $('.snow');
for (let i = 0; i < 26; i++) {
  const f = document.createElement('span');
  f.textContent = i % 3 ? '•' : '❆';
  Object.assign(f.style, {
    left: `${Math.random() * 100}%`,
    fontSize: `${(i % 3 ? 6 : 12) + Math.random() * 8}px`,
    opacity: 0.35 + Math.random() * 0.55,
    animationDuration: `${9 + Math.random() * 10}s`,
    animationDelay: `${-Math.random() * 19}s`,
  });
  f.style.setProperty('--x', `${(Math.random() - 0.5) * 160}px`);
  snow.append(f);
}

// ---- Fill the invitation in the chosen language (textContent only, never innerHTML with user data) ----
function apply(chosen) {
  lang = chosen;
  T = C.text[lang];
  const l = L[lang];
  const [groom, bride] = C.names[lang];
  document.documentElement.lang = lang;
  document.title = T.pageTitle;
  const vals = {
    ...T, groom, bride,
    initials: `${groom[0]}&${bride[0]}`,
    dateDots,
    dateLong: l.long(l.weekdays[dow], dd, l.month[mo - 1], y),
    monthYear: `${l.monthNom[mo - 1]} ${y}`,
  };
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = vals[el.dataset.t] ?? ''; });
  document.querySelectorAll('[data-alt]').forEach((el) => { el.alt = vals[el.dataset.alt] ?? ''; });
  document.querySelectorAll('[data-ph]').forEach((el) => { el.placeholder = vals[el.dataset.ph] ?? ''; });

  // Greeting: one span per word so each can light up as it scrolls in
  const verse = $('#verse');
  verse.replaceChildren(...verse.textContent.split(' ').flatMap((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.style.setProperty('--i', i);
    s.textContent = w;
    return [s, ' '];
  }));

  // Evening program
  const programEl = $('#program');
  (T.program || []).forEach((item) => {
    const li = document.createElement('li');
    const time = document.createElement('time');
    time.textContent = item.time;
    const title = document.createElement('span');
    title.textContent = item.title;
    li.append(time, title);
    programEl.append(li);
    io.observe(li);
  });
  if (!programEl.children.length) programEl.closest('section').remove();

  // Venue
  const eventsEl = $('#events');
  T.events.forEach((ev) => {
    const box = document.createElement('div');
    box.className = 'event';
    for (const [cls, val] of [['e-title', ev.title], ['e-time', ev.time], ['e-place', ev.place], ['e-addr', ev.address]]) {
      if (!val) continue;
      const el = document.createElement('p');
      el.className = cls;
      el.textContent = val;
      if (cls === 'e-place') el.lang = 'en';   // hotel name: keep MARRIOTT's plain I when uppercased in Azerbaijani
      box.append(el);
    }
    eventsEl.append(box);
  });
  if (C.mapQuery) {
    $('#map').title = T.mapTitle;
    $('#map').src = `https://maps.google.com/maps?q=${encodeURIComponent(C.mapQuery)}&z=15&hl=${lang}&output=embed`;
    $('#directions').href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(C.mapQuery)}`;
  } else {
    $('.map').remove();
    $('#directions').remove();
  }

  // Calendar (month of the wedding, Monday first)
  const firstDow = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells = l.wd.map((d) => `<span class="wd">${d}</span>`);
  for (let i = 0; i < firstDow; i++) cells.push('<span></span>');
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d === dd
      ? `<span class="the-day">${d}<svg viewBox="0 0 60 60" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M44 9C33 2 12 6 7 24c-4 16 8 30 25 29 17-1 25-14 22-29-2-9-10-14-20-14"/></svg></span>`
      : `<span>${d}</span>`);
  }
  $('#cal').innerHTML = cells.join('');

  tick();
  timer = setInterval(tick, 1000);

  const prev = remembered();
  if (prev) showDone(prev);
}

// ---- Opening: pick a language, the frost melts, the view glides into the tunnel ----
const gate = $('#gate');
const audio = $('#audio');
const musicBtn = $('#music');
function openInvite(chosen) {
  if (gate.classList.contains('open')) return;
  apply(chosen);
  gate.classList.add('open');
  document.body.classList.add('revealing');
  window.scrollTo(0, 0);
  setTimeout(() => {
    document.body.classList.remove('locked');
    gate.remove();
  }, rm ? 300 : 3300);
  if (C.music) {   // the tap is the user gesture browsers require for audio
    audio.src = C.music;
    // jump to musicStart as soon as the length is known (needs a server that answers Range requests, as Cloudflare does)
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = C.musicStart || 0; }, { once: true });
    audio.volume = 0.7;
    musicBtn.hidden = false;
    audio.play().catch(() => {});
  }
}
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => openInvite(b.dataset.lang)));
// loop back to musicStart, not to 0:00
audio.addEventListener('ended', () => { audio.currentTime = C.musicStart || 0; audio.play().catch(() => {}); });
musicBtn.addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
audio.addEventListener('play', () => { musicBtn.classList.add('playing'); musicBtn.ariaLabel = T.musicOff; });
audio.addEventListener('pause', () => { musicBtn.classList.remove('playing'); musicBtn.ariaLabel = T.musicOn; });

// ---- Reveal on scroll ----
const io = new IntersectionObserver((es) => es.filter((e) => e.isIntersecting).forEach((e, k) => {
  e.target.style.transitionDelay = `${k * 0.18}s`;   // several entering at once still appear one after another
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.greeting, .frame, .date, .venue, .program, .closing').forEach((el) => io.observe(el));

// ---- Countdown ----
let timer;
function set(id, v) {
  const el = $(id);
  el.nextElementSibling.textContent = L[lang].unit(id[1], v);
  if (el.textContent === String(v)) return;
  el.textContent = v;
  if (!rm) el.animate([{ transform: 'translateY(-55%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
}
function tick() {
  const ms = start - Date.now();
  if (ms <= 0) {
    const p = document.createElement('p');
    p.className = 'verse in';
    p.style.margin = '0 auto';
    p.textContent = T.married;
    $('#timer').replaceWith(p);
    return clearInterval(timer);
  }
  set('#d', Math.floor(ms / 864e5));
  set('#h', pad(Math.floor(ms / 36e5) % 24));
  set('#m', pad(Math.floor(ms / 6e4) % 60));
  set('#s', pad(Math.floor(ms / 1e3) % 60));
}

// ---- RSVP ----
const form = $('#rsvpForm');
const ifYes = $('.if-yes');
const msg = $('.rsvp-msg');
const done = $('.rsvp-done');
const nudge = $('#rsvpNudge');
const STORE = 'rsvp-veli-aynur-baku';
const remembered = () => { try { return JSON.parse(localStorage.getItem(STORE)); } catch { return null; } };

function showDone(r) {
  $('.rsvp-thanks').textContent = (r.attending === 'yes' ? T.thanksYes : T.thanksNo).replace('{name}', r.name);
  form.hidden = true;
  done.hidden = false;
  updateNudge();
}

form.addEventListener('change', (e) => {
  if (e.target.name === 'attending') ifYes.hidden = e.target.value !== 'yes';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  if (!name) { msg.textContent = T.errName; form.elements.name.focus(); return; }
  if (!data.get('attending')) { msg.textContent = T.errChoice; return; }
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = T.fSending;
  msg.textContent = '';
  try {
    // urlencoded body = "simple" request, so the GitHub Pages copy can post here without a CORS preflight
    const res = await fetch(C.rsvpUrl, { method: 'POST', body: new URLSearchParams(data) });
    if (!res.ok) throw new Error(res.status);
    const r = { name, attending: data.get('attending') };
    try { localStorage.setItem(STORE, JSON.stringify(r)); } catch {}
    showDone(r);
  } catch {
    msg.textContent = T.errNet;
  } finally {
    btn.disabled = false;
    btn.textContent = T.fSubmit;
  }
});

$('#rsvpEdit').addEventListener('click', () => {
  done.hidden = true;
  form.hidden = false;
  form.elements.name.focus();
});

// Floating reminder: shown after the hero, hidden while the form is on screen or once answered
let rsvpInView = false;
function updateNudge() {
  nudge.hidden = !!remembered() || rsvpInView || document.body.classList.contains('locked') || scrollY < innerHeight * 0.6;
}
new IntersectionObserver(([e]) => { rsvpInView = e.isIntersecting; updateNudge(); }).observe($('#rsvp'));
addEventListener('scroll', updateNudge, { passive: true });
