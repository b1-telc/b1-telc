/* telc B1 Training — einfache App, keine externen Bibliotheken */
'use strict';

const app    = document.getElementById('app');
const elBack = document.getElementById('btnBack');
const elReset= document.getElementById('btnReset');
const elHome = document.getElementById('btnHome');
const elSettings = document.getElementById('btnSettings');
const elSetmenu  = document.getElementById('setmenu');
const elTimer= document.getElementById('timer');
const elTime = document.getElementById('timerText');
const elToast= document.getElementById('toast');

const S = {
  index: null,      // Übersicht der Modelltests
  modell: null,     // geöffneter Modelltest
  run: null,        // laufender Durchgang: ein Teil oder ein ganzer Prüfungsteil
  answers: {},      // { itemId: Antwort }
  dropped: {},      // { itemId: [früher gewählte Buchstaben] } — werden durchgestrichen
  checks: {},       // { itemId: [Leitpunkt abgehakt?] } — Selbstkontrolle beim Brief
  plays:  {},       // { sectionId: كم مرّة انشغّل الصوت } — بينحفظ مع الجلسة
  tick: null,       // Timer
  left: 0,          // verbleibende Sekunden
  view: 'home',
  level: 'b1',      // aktuelle Prüfungsstufe
  levels: [],       // Stufen, die das Abo abdeckt
  sub: null,        // laufendes Abonnement { levels, current_period_end }
  resources: null   // Lesematerial, beim ersten Öffnen geladen
};

/* ============ Helfer ============ */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss = s => `${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.max(0,s)%60).padStart(2,'0')}`;

function ask(text, onYes, yes, no){
  yes = yes || t('yes'); no = no || t('no');
  const back = document.createElement('div');
  back.className = 'modalback';
  back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <p>${esc(text)}</p>
    <div class="modalbtns">
      <button class="btn grey" data-no>${esc(no)}</button>
      <button class="btn" data-yes>${esc(yes)}</button>
    </div></div>`;
  const close = () => back.remove();
  back.querySelector('[data-no]').onclick = close;
  back.querySelector('[data-yes]').onclick = () => { close(); onYes(); };
  back.onclick = e => { if (e.target === back) close(); };
  document.body.appendChild(back);
  back.querySelector('[data-yes]').focus();
}

function toast(msg, ms = 2400){
  elToast.textContent = msg; elToast.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => elToast.hidden = true, ms);
}
function load(key, fallback){
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, val){
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/* ★ أيقونات SVG للأزرار الصغيرة (مو إيموجي): بتتلوّن بـcurrentColor، فبنقدر
   نخلّي السلة حمراء والـi داكنة على كل الأجهزة (الإيموجي أحياناً بيتجاهل اللون). */
const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11.2v4.8"/><circle cx="12" cy="7.8" r="0.1"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M18 7l-1 12.5H7L6 7M10 10.5v6M14 10.5v6"/></svg>`;

/* ============ Timer ============ */
function startTimer(seconds, onEnd){
  stopTimer();
  S.left = seconds;
  elTimer.hidden = false;
  paint();
  S.tick = setInterval(() => {
    S.left--;
    paint();
    if (S.left % 5 === 0) saveSession(S.run);
    if (S.left <= 0){ stopTimer(); onEnd && onEnd(); }
  }, 1000);

  function paint(){
    elTime.textContent = mmss(S.left);
    elTimer.classList.toggle('low', S.left <= 60);
  }
}
function stopTimer(){
  if (S.tick){ clearInterval(S.tick); S.tick = null; }
  elTimer.hidden = true;
  elTimer.classList.remove('low');
}

/* ============ Navigation ============ */
/* ★ `new Audio()` مو عنصر بالصفحة: استبدال app.innerHTML بيشيل الأزرار
   وشريط التقدّم، بس الصوت كائن بالذاكرة ماسكه الـclosure — وبيضل شغّال
   بعد ما الطالب يطلع من الامتحان، ويسمع الحلول على شاشة تانية. لهيك
   منسجّل كل تسجيل، ومنوقّفه عند كل تنقّل. */
const LIVE = new Set();
function stopAudio(){
  for (const a of LIVE) { try { a.pause(); a.src = ''; } catch {} }
  LIVE.clear();
}
/* ★ وقفة لطيفة: بتسكّت الصوت بس بتضلّ ماسكة المصدر، فبعد «متابعة»
   بترجع تشتغل. `stopAudio` بتفرّغ `src` نهائياً (للتنقّل بين الشاشات)،
   فما بتنفع لوقفة الامتحان المؤقّتة.
   منسجّل مين كان شغّال وقت الوقفة، تا «متابعة» يكمّل من نفس المحلّ
   (مو من الأول) أوتوماتيكياً. */
let HELD = [];
function pauseAudio(){
  HELD = [];
  for (const a of LIVE) {
    try { if (!a.paused && !a.ended){ HELD.push(a); a.pause(); } } catch {}
  }
}
function resumeAudio(){
  const held = HELD; HELD = [];
  for (const a of held) { try { a.play().catch(() => {}); } catch {} }
}

function go(view, fn){
  stopAudio();
  S.view = view;
  // آخر دالة رسم: تبديل اللغة بيعيد نداءها بمكانها. الشاشات بتاخد
  // وسائط (نتيجة، جولة…)، فإعادة بنائها من اسم الشاشة بيضيّعهن.
  S.render = fn;
  elBack.hidden = (view === 'home');
  elBack.setAttribute('aria-label', t('back'));   // ‹ Symbol bleibt, Label übersetzt
  elReset.hidden = (view !== 'praxis');            // Zurücksetzen nur in der Übung
  elReset.setAttribute('aria-label', t('praxisReset'));
  window.scrollTo(0, 0);
  fn();
}
/* ============ الإعدادات ============ */
/* لغة، مظهر، حجم خط — شاشة كاملة مو قوائم بالشريط. الشريط ضيّق على
   الموبايل، وأزرار كبيرة واضحة أسهل بكتير لمين مو متعوّد على التقنية —
   وهدول بالضبط ناسنا.

   الواجهة بس بتنترجم: محتوى الامتحان بيضل ألماني، لأن قراءة التعليمة
   الألمانية جزء من الاختبار. */
/* ★ زرّين بس بالواجهة: ☀ و🌙.
   «متل الجهاز» ضل شغّال كسلوك — مين ما لمس شي، التطبيق بيتبع إعداد
   جهازه — بس ما عاد إله زرّ: تلات خيارات لمظهر بتخلّي القرار أصعب مما
   يستاهل، والزرّ التالت (🖥) ما بيقول شي لمين مو متعوّد على التقنية.
   المعلّم هو المظهر يلي شايفه فعلاً، حتى لو جاي من إعداد الجهاز. */
const THEMES = ['light', 'dark'];
const SIZES  = [0.9, 1, 1.15, 1.35];      // مضروب بحجم الخط الأساسي

function applyLook(){
  const th = load('b1.theme', 'system');
  // 'system' = بلا سمة صريحة، فالـCSS بيتبع prefers-color-scheme
  if (th === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = th;

  let sz = load('b1.size', 1);
  if (!SIZES.includes(sz)) sz = 1;
  document.documentElement.style.setProperty('--fs', (16 * sz) + 'px');
}

/* ★ الإعدادات بترويسة الصفحة الرئيسية، مو ورا زرّ ⚙.
   الزرّ كان بيفتح شاشة لحالها: يعني ضغطتين وخروج من الصفحة تا يكبّر
   الخط أو يبدّل لغته. ومين ما بيقرا الألماني ما كان يعرف إنّ ⚙ تعني
   إعدادات أصلاً. هلق الأعلام والأزرار ظاهرة أول ما يفتح التطبيق. */
/* المظهر المعروض حالياً — سواء انختار بالإيد أو إجا من الجهاز */
function shownTheme(){
  const th = load('b1.theme', 'system');
  if (th === 'light' || th === 'dark') return th;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setbarHTML(){
  const th = shownTheme();
  let sz = load('b1.size', 1);
  if (!SIZES.includes(sz)) sz = 1;
  const i = SIZES.indexOf(sz);
  const ic = { light: '☀', dark: '🌙' };

  return `<div class="setbar" role="group" aria-label="${esc(t('settings'))}">
    <div class="setgrp">
      ${I18N.LANGS.map(l => `<button class="chip flagchip${l.id === I18N.lang ? ' on' : ''}"
        data-lang="${esc(l.id)}" title="${esc(l.name)}"
        aria-label="${esc(l.name)}">${l.flag}</button>`).join('')}
    </div>
    <div class="setgrp">
      ${THEMES.map(x => `<button class="chip${x === th ? ' on' : ''}"
        data-theme="${esc(x)}" title="${esc(t(x === 'light' ? 'themeLight' : 'themeDark'))
        }">${ic[x]}</button>`).join('')}
    </div>
    <div class="setgrp">
      <button class="chip" data-size="-" ${i === 0 ? 'disabled' : ''}
        title="${esc(t('smaller'))}" aria-label="${esc(t('smaller'))}">A−</button>
      <button class="chip" data-size="+" ${i === SIZES.length - 1 ? 'disabled' : ''}
        title="${esc(t('bigger'))}" aria-label="${esc(t('bigger'))}">A+</button>
    </div>
  </div>`;
}

applyLook();
I18N.apply();

/* الكتالوج بيعرض الامتحانات المقفولة للتشويق — تحسين، مو شرط.
   فشله (قاعدة قديمة، أو واجهة ما بتعرفه) ما لازم يمنع التطبيق يشتغل. */
async function loadCatalog(id){
  try { return (API.catalog ? await API.catalog(id) : []) || []; }
  catch { return []; }
}

elBack.onclick = () => {
  if (S.view === 'exam'){
    ask(t('leaveAsk'),
        () => { stopTimer(); (S.run && (S.run.drill || S.run.sim)) ? screenLevel() : screenModell(S.modell); },
        t('leave'));
  } else if (S.view === 'result' || S.view === 'intro'){
    stopTimer();
    if (S.run && (S.run.drill || S.run.sim)) screenLevel(); else screenModell(S.modell);
  } else if (S.view === 'resource'){
    screenResources();
  } else if (S.view === 'praxis'){
    // zurück zur Teilliste der Fertigkeit
    if (S.modell && S.praxisSkill) screenSkill(S.praxisSkill); else screenLevel();
  } else if (S.view === 'skill' || S.view === 'modell'){
    // zurück zum Inhalt der Stufe (Fertigkeiten/Modelltests)
    screenLevel();
  } else if (S.view === 'level'){
    // zurück zu den Stufen-Karten (Startseite)
    screenHome();
  } else {
    screenHome();
  }
};

// ★ Zurücksetzen-Symbol im Header: setzt den aktuellen Übungsteil zurück
//   (mit Bestätigung). Sichtbar nur in der Übung (view === 'praxis').
elReset.onclick = () => {
  if (S.view !== 'praxis' || !S.praxisSecs) return;
  ask(t('praxisResetAsk'), () => praxisReset(S.praxisSecs), t('praxisReset'));
};

// ★ Name im Header = zurück zur Startseite (jederzeit).
elHome.onclick = () => screenHome();

// ★ Einstellungen (Sprache/Thema/Schrift) über ein Header-Menü — überall
//   erreichbar, ohne zur Startseite zu müssen.
function renderSetmenu(){
  elSetmenu.innerHTML = setbarHTML();
  elSetmenu.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => {
    I18N.setLang(b.dataset.lang); renderSetmenu();
    elBack.setAttribute('aria-label', t('back'));
    S.render && S.render();                       // aktuelle Seite neu zeichnen
  });
  elSetmenu.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => {
    save('b1.theme', b.dataset.theme); applyLook(); renderSetmenu();   // CSS-Variable, kein Neuaufbau nötig
  });
  elSetmenu.querySelectorAll('[data-size]').forEach(b => b.onclick = () => {
    let sz = load('b1.size', 1); if (!SIZES.includes(sz)) sz = 1;
    const k = Math.min(SIZES.length - 1,
                Math.max(0, SIZES.indexOf(sz) + (b.dataset.size === '+' ? 1 : -1)));
    save('b1.size', SIZES[k]); applyLook(); renderSetmenu();
  });
}
const closeSetmenu = () => { elSetmenu.hidden = true; elSettings.classList.remove('on'); };
elSettings.onclick = e => {
  e.stopPropagation();
  if (elSetmenu.hidden){ renderSetmenu(); elSetmenu.hidden = false; elSettings.classList.add('on'); }
  else closeSetmenu();
};
document.addEventListener('click', e => {
  if (!elSetmenu.hidden && !elSetmenu.contains(e.target) && e.target !== elSettings) closeSetmenu();
});

/* ============ Start ============ */
/* Die Inhalte liegen jetzt auf dem Server und sind an ein Abonnement
   gebunden. Beim Start wird deshalb zuerst die Sitzung geprüft: ohne
   gültigen Zugang kommt der Code-Bildschirm, sonst die Übersicht. */
async function boot(){
  if (!API.configured()){
    app.innerHTML = `<div class="empty">${esc(t('notConfigured'))}
<br>${esc(t('fillConfig'))}</div>`;
    return;
  }
  app.innerHTML = `<div class="empty">${esc(t('moment'))}</div>`;
  try {
    await API.ensureSession();
    S.sub = API.hasSession() ? await API.subscription() : null;
  } catch { S.sub = null; }

  if (!S.sub){
    // بالطابور؟ منرجّعه لمكانه بدل ما نطلب منه كوده من جديد
    let w = null;
    try { w = API.hasSession() ? await API.waitlist() : null; } catch {}
    if (w && w.waiting && !w.open) return screenWait(w.position, w.total);
    return screenCode(w && w.waiting && w.open ? t('waitOpen') : undefined);
  }

  bumpStreak();                               // Tagesserie zählen (einmal pro Tag)
  try { S.levels = await API.myLevels(S.sub); } catch { S.levels = []; }
  // die zuletzt gewählte Stufe merken, sonst die erste des Abos
  const saved = load('b1.level', null);
  S.level = (saved && S.sub.levels.includes(saved)) ? saved
          : (S.sub.levels && S.sub.levels[0]) || 'b1';
  try {
    S.index = await API.index(S.level);
  } catch {
    app.innerHTML = `<div class="empty">${esc(t('noServer'))}<br>${esc(t('tryLater'))}</div>`;
    return;
  }
  S.catalog = await loadCatalog(S.level);
  if (isPraxis()){ try { S.modell = await praxisTest(); } catch { S.modell = null; } }
  screenHome();
}

/* ★ قائمة الانتظار.
   الكود ما بينستهلك — بيضل ساري لصاحبه — فالطالب ما بيخسر شي، بس
   بيستنى دوره. ومنقول له رقمه: «إنت رقم ٤٧» بتقول إنّ في ناس غيره،
   وهاد بيشتغل لصالحنا أكتر من أي إعلان.

   وما منخلّيه يعيد إدخال الكود تا يعرف: زرّ واحد بيسأل الخادم. */
function screenWait(pos, total){
  stopTimer();
  go('wait', () => {
    elBack.hidden = true;
    app.innerHTML = `
      <h1>${esc(t('waitTitle'))}</h1>
      <div class="card queue">
        <div class="qnum">${esc(String(pos ?? '—'))}</div>
        <p class="qlabel">${esc(t('waitPos', { n: pos }))}</p>
        ${total > 1 ? `<p class="sub">${esc(plural(total, 'nWaiting'))}</p>` : ''}
      </div>
      <p class="sub">${esc(t('waitHint'))}</p>
      <button class="btn wide" id="wchk">${esc(t('waitCheck'))}</button>`;

    const b = document.getElementById('wchk');
    b.onclick = async () => {
      b.disabled = true; b.textContent = t('codeChecking');
      let st = null;
      try { st = await API.waitlist(); } catch {}
      b.disabled = false; b.textContent = t('waitCheck');
      if (!st || !st.waiting) return boot();      // دوره إجا أو خرج من الطابور
      if (st.open) return screenCode(t('waitOpen'));
      screenWait(st.position, st.total);
      toast(t('waitStill'));
    };
  });
}

/* Zugang per Code — es gibt keine E-Mail und kein Passwort. */
function screenCode(msg){
  stopTimer();
  go('code', () => {
    // مين عنده اشتراك إجا لهون بإرادته — لازم يقدر يرجع.
    // ومين ما عنده، الرجوع لوين؟ فبيضل مخفي.
    elBack.hidden = !S.sub;
    app.innerHTML = `
      <h1>${esc(t('codeTitle'))}</h1>
      <p class="sub">${esc(t('codeHint'))}</p>
      ${msg ? `<div class="instr" style="color:var(--bad)">${esc(msg)}</div>` : ''}
      <div class="card">
        <input id="code" class="codeinput" type="text" inputmode="text"
               autocapitalize="characters" autocorrect="off" spellcheck="false"
               autocomplete="one-time-code"
               placeholder="B14827519366" aria-label="${esc(t('codeTitle'))}">
        <p class="sub" style="margin:6px 0 0">${esc(t('codeExample'))}</p>
        <button class="btn" id="godo" style="width:100%;margin-top:10px">${esc(t('codeButton'))}</button>
      </div>`;

    const inp = document.getElementById('code');
    const btn = document.getElementById('godo');

    /* الكود بينكتب متل ما هو مكتوب بالرسالة: بلا فراغات ولا شرطات.
       كنا منضيف فراغات للقراءة، بس الكود بيوصل عبر واتساب — وهناك ما
       بينعرف إذا الفراغ واحد أو اتنين، فبيصير سؤال بلا داعي. يلي
       بيلصق كود قديم بشرطات ما بينكسر: بينشالوا هون وبـcode_norm.

       ★ وبلا maxlength: المتصفّح بيقصّ الملصوق **قبل** ما يوصلنا، فكود
       منسوخ من واتساب مع فراغاته (١٥ خانة) كان بيوصل ناقص آخر رقمين.
       الحدّ هون، بعد التنضيف، على الخانات الحقيقية. */
    inp.oninput = () => {
      inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    };

    const send = async () => {
      const code = inp.value.trim();
      if (!code) return inp.focus();
      btn.disabled = true; btn.textContent = t('codeChecking');
      let r;
      try { r = await API.redeem(code); }
      catch { r = { ok: false, error: 'network' }; }
      btn.disabled = false; btn.textContent = t('codeButton');
      if (r && r.ok){ save('b1.hidden', []); return boot(); }   // neuer Code → alles wieder einblenden
      // مو خطأ: الكود صحيح وباقي ساري، بس ما في مطرح هلق
      if (r && r.error === 'waitlist') return screenWait(r.position, r.total);
      if (r && r.error === 'too_many_attempts'){
        const m = Math.ceil((r.retry_after || 900) / 60);
        return screenCode(t('codeErrTooMany', { t: I18N.plural(m, 'nMinute') }));
      }
      screenCode(t({
        invalid_code:   'codeErrUnknown',
        already_used:   'codeErrUsed',
        revoked:        'codeErrRevoked',
        code_exhausted: 'codeErrExhausted',
        device_limit:   'codeErrDevices',
        network:        'codeErrNetwork'
      }[r && r.error] || 'codeErrOther'));
    };
    btn.onclick = send;
    inp.onkeydown = e => { if (e.key === 'Enter') send(); };
    inp.focus();
  });
}

/* Wiederholung: nur was heute fällig ist. Der Rest wartet auf sein Datum —
   das ist der Sinn der Kästen. */
let review = { due: 0, total: 0, mastered: 0, next_due: null };
async function refreshMistakes(){
  try { review = await API.reviewSummary() || review; }
  catch { review = { due: 0, total: 0, mastered: 0, next_due: null }; }
}

/* ★ Inhalt einer Stufe: die Fertigkeiten/Modelltests + Simulation. Erreicht
   man durch Antippen einer Stufen-Karte auf der Startseite; „zurück" führt
   wieder zu den Karten. */
function screenLevel(){
  stopTimer();
  // Die Fehlerzahl kommt vom Server. Neu gezeichnet wird nur, wenn sie sich
  // geändert hat — sonst ruft sich der Bildschirm endlos selbst auf.
  const before = review.due;
  refreshMistakes().then(() => {
    if (S.view === 'level' && review.due !== before) screenLevel();
  });
  go('level', () => {
    cacheLevelProgress();   // Fortschritt dieser Stufe für die Startseite sichern
    /* المقفولة بتنعرض بعنوانها وعدد أسئلتها بس — محتواها ما بينحمّل
       ولا بينوجد بالصفحة. هدفها إن صاحب التجريبي يعرف إنه في غير
       امتحان. المصدر level_catalog، وهي بترجّع بيانات وصفية فقط. */
    const open = new Set(S.index.modelle.map(m => m.id));
    const list = (S.catalog && S.catalog.length)
      ? S.catalog
      : S.index.modelle.map(m => ({ ...m, open: true }));

    /* Goethe: nach Fertigkeit üben — die Fertigkeiten (Lesen, Hören …)
       statt einzelner Modelltests. Jede Fertigkeit zeigt, wie viele Teile
       sie hat. */
    const skills = (isPraxis() && S.modell) ? praxisSkills(S.modell) : null;
    const cards = skills && skills.length
      ? skills.map(sk => {
          const nParts = S.modell.blocks.filter(b => blockSkill(S.modell, b) === sk).length;
          return `<button class="tile" data-skill="${esc(sk)}">
          <span class="n">${skillIcon(sk)}</span>
          <span class="grow"><span style="font-weight:600">${esc(sk)}</span>
            <div class="meta">${plural(nParts, 'nPart')}</div></span>
          <span class="chev">›</span>
        </button>`; }).join('')
      : list.map((m, i) => {
      const frei = m.open !== false && open.has(m.id);
      return `<button class="tile${frei ? '' : ' locked'}"
        ${frei ? `data-id="${esc(m.id)}"` : 'disabled'}>
        <span class="n">${frei ? i + 1 : '🔒'}</span>
        <span class="grow"><span style="font-weight:600">${esc(m.title)}</span>
          <div class="meta">${plural(m.aufgaben, 'nTask')} · ${
            plural(m.minutes, 'nMinute')}</div></span>
        <span class="chev">${frei ? '›' : ''}</span>
      </button>`;
    }).join('');

    const nLocked = list.filter(m => m.open === false).length;

    const nMist = review.due;
    const lvl = S.levels.find(l => l.id === S.level);

    /* «telc · B1». مستوى قديم بلا مؤسسة بيضل بعنوانه — ما منخترع وحدة. */
    const name = l => l.provider && l.stufe
      ? `${l.provider} · ${l.stufe}` : (l.title || l.id);

    app.innerHTML = `
      <h1>${lvl ? esc(name(lvl)) : ''}</h1>
      <p class="sub">${isPraxis() ? esc(t('praxisHome'))
        : lvl ? esc(t('homeIntro', { level: name(lvl) }))
              : esc(t('homeIntroPlain'))}</p>
      ${nLocked ? `<div class="upsell">
        ${esc(t('upsell', { n: plural(nLocked, 'nMore') }))}
      </div>` : ''}
      ${nMist ? `<button class="tile drill" id="drill">
        <span class="n">↻</span>
        <span class="grow"><span style="font-weight:600">${esc(t('repeat'))}</span>
          <div class="meta">${esc(t('due', { n: plural(nMist, 'nTask') }))}${
            review.mastered
              ? ' · ' + esc(t('sitting', { n: plural(review.mastered, 'nSits') })) : ''
            } · ${esc(t('noTime'))}</div></span>
        <span class="chev">›</span>
      </button>`
      : (review.total ? `<div class="tile drill done">
        <span class="n">✓</span>
        <span class="grow"><span style="font-weight:600">${esc(t('nothingDue'))}</span>
          <div class="meta">${review.mastered ? `${plural(review.mastered, 'nSits')}` : esc(t('allRepeated'))}${
            review.next_due ? ` · ${esc(t('nextOn', { date: new Date(review.next_due).toLocaleDateString('de-DE') }))}` : ''}</div></span>
      </div>` : '')}
      ${cards}
      ${(skills && skills.length) ? `<button class="tile simtile" id="simstart">
        <span class="n">📝</span>
        <span class="grow"><span style="font-weight:600">${esc(t('simStart'))}</span>
          <div class="meta">${esc(t('simDesc'))}</div></span>
        <span class="chev">›</span>
      </button>` : ''}`;

    const simb = document.getElementById('simstart');
    if (simb) simb.onclick = () => startSim();
    app.querySelectorAll('.tile[data-id]').forEach(b =>
      b.onclick = () => openModell(b.dataset.id));
    app.querySelectorAll('.tile[data-skill]').forEach(b =>
      b.onclick = () => openSkill(b.dataset.skill));
    const dr = document.getElementById('drill');
    if (dr) dr.onclick = async () => {
      const run = await drillRun();
      if (run) screenIntro(run); else toast(t('noMistakes'));
    };
  });
}

/* ★ Fortschritt der aktuell geladenen Stufe.
   Goethe: 3 Farben über die bewertbaren Aufgaben (Lesen/Hören/Schreiben Teil 1)
   — grün = richtig, rot = falsch, grau = noch nicht beantwortet/bewertet.
   Quelle b1.praxstat (automatisch über gradePending gefüllt). telc: ein
   Modelltest zählt, sobald ein Ergebnis vorliegt. Je Stufe gecacht. */
function levelProgress(){
  if (isPraxis() && S.modell){
    const st = (praxStat()[S.level]) || {};
    let green = 0, red = 0, total = 0;
    S.modell.sections.forEach(s => (s.items || []).forEach(it => {
      total++;
      const v = st[it.id];
      if (v === 1) green++; else if (v === 0) red++;
    }));
    return { rag: true, green, red, gray: total - green - red, total };
  }
  const modelle = (S.index && S.index.modelle) || [];
  const prog = load('b1.progress', {});
  let done = 0;
  modelle.forEach(m => { if (prog[m.id] && Object.keys(prog[m.id]).length) done++; });
  return { done, total: modelle.length };
}
function cacheLevelProgress(){
  const all = load('b1.levelprog', {});
  all[S.level] = levelProgress();
  save('b1.levelprog', all);
}

/* ★ 3-Farben-Balken (grün richtig · rot falsch · grau offen) als HTML.
   Jedes Segment mit Wert hat eine Mindestbreite, damit die Prozentzahl passt. */
function ragBar(green, red, total){
  if (!total) return '';
  const gray = total - green - red;
  const pctOf = c => Math.round(c / total * 100);
  const seg = (cls, count) => `<i class="${cls}" style="flex:${count} 1 0;${
    count ? 'min-width:40px' : ''}">${count ? pctOf(count) + '%' : ''}</i>`;
  return `<span class="ragbar big">${seg('g', green)}${seg('r', red)}${seg('n', gray)}</span>`;
}
// Richtig/Falsch/Gesamt über eine Menge Aufgaben-IDs (für Teil-Balken).
function statsFor(ids){
  const st = (praxStat()[S.level]) || {};
  let green = 0, red = 0;
  ids.forEach(id => { const v = st[id]; if (v === 1) green++; else if (v === 0) red++; });
  return { green, red, total: ids.length };
}

/* ★ Statistik-Leiste: Serie (Streak), gelöste Aufgaben, gemeisterte Items. */
const dayKey = d => { d = d || new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
// Zählt den heutigen Tag zur Serie: gestern aktiv → +1, sonst neu bei 1.
function bumpStreak(){
  const s = load('b1.streak', { last: null, days: 0 });
  const today = dayKey();
  if (s.last === today) return;
  const y = dayKey(new Date(Date.now() - 86400000));
  s.days = s.last === y ? (s.days || 0) + 1 : 1;
  s.last = today;
  save('b1.streak', s);
}
// Serie nur gültig, wenn heute oder gestern aktiv — sonst abgelaufen (0).
function streakDays(){
  const s = load('b1.streak', { last: null, days: 0 });
  if (!s.last) return 0;
  const today = dayKey(), y = dayKey(new Date(Date.now() - 86400000));
  return (s.last === today || s.last === y) ? (s.days || 0) : 0;
}
// Beantwortete Übungsaufgaben über alle Stufen.
function solvedCount(){
  let n = 0;
  Object.values(load('b1.praxis', {})).forEach(lvl =>
    Object.values(lvl || {}).forEach(blk =>
      Object.values(blk || {}).forEach(v => { if (String(v ?? '').trim() !== '') n++; })));
  return n;
}
const currentLevelName = () => {
  const l = (S.levels || []).find(x => x.id === S.level);
  return l ? (l.provider && l.stufe ? `${l.provider} · ${l.stufe}` : (l.title || l.id)) : '';
};
// Letzten geöffneten Teil merken, für „Weitermachen" auf der Startseite.
function recordLast(obj){ save('b1.last', obj); }
// Dorthin zurückspringen (Stufe bei Bedarf laden).
async function resumeLast(){
  const last = load('b1.last', null);
  if (!last) return;
  if (last.level && last.level !== S.level){
    S.level = last.level; save('b1.level', last.level);
    Object.keys(modellCache).forEach(k => delete modellCache[k]);
    S.modell = null;
    app.innerHTML = `<div class="empty">${esc(t('moment'))}</div>`;
    try { S.index = await API.index(last.level); } catch { return void toast(t('levelFailed')); }
    S.catalog = await loadCatalog(last.level);
  }
  if (last.type === 'praxis'){
    if (!S.modell){ try { S.modell = await praxisTest(); } catch { S.modell = null; } }
    if (!S.modell) return screenLevel();
    S.praxisSkill = last.skill;
    screenPractice(last.blockId);
  } else if (last.type === 'modell'){
    openModell(last.modellId);
  } else {
    screenLevel();
  }
}

/* ★ Startseite: Begrüßung + eine Karte je Stufe (Goethe · A1, telc · B1 …)
   plus eine „+"-Karte zum Code-Einlösen. Antippen einer Karte öffnet den
   Inhalt der Stufe (screenLevel); „zurück" führt wieder hierher. */
function screenHome(){
  stopTimer();
  // ★ Antworten im Hintergrund bewerten, dann Balken neu zeichnen.
  gradePending().then(changed => {
    cacheLevelProgress();
    if (changed && S.view === 'home') screenHome();
  });
  cacheLevelProgress();                       // Fortschritt der aktuellen Stufe sichern
  go('home', () => {
    const progCache = load('b1.levelprog', {});
    const progOf = l => l.id === S.level ? levelProgress() : progCache[l.id];
    const name = l => l.provider && l.stufe
      ? `${l.provider} · ${l.stufe}` : (l.title || l.id);
    const leftMs = id => {
      const d = S.sub && S.sub.until && S.sub.until[id];
      return d ? new Date(d) - Date.now() : null;
    };
    // الوقت الباقي: بالساعات لما يكون أقل من يومين (كود ٢٤ ساعة ما يطلع «يوم»).
    const remaining = ms => {
      if (ms == null) return '';
      if (ms <= 0) return t('expired');
      if (ms >= 48 * 3600000) return plural(Math.ceil(ms / 86400000), 'daysLeft');
      const h = Math.ceil(ms / 3600000);
      if (h >= 1) return plural(h, 'hoursLeft');
      return t('lessThanHour');
    };
    const endsFmt = id => {
      const d = S.sub && S.sub.until && S.sub.until[id];
      if (!d) return '';
      return new Date(d).toLocaleDateString('de-DE',
        { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    // ★ الكرت div (مو button) تا يقدر يحمل زرّ حذف جوّاته (زرّ جوّا زرّ غلط).
    const entry = l => {
      const ms = leftMs(l.id);
      const h  = ms == null ? null : Math.floor(ms / 3600000);
      const soon = h != null && h < 24 * 7;
      const only = S.sub && S.sub.scope && S.sub.scope[l.id];
      const lp = progOf(l);
      let bar = '';
      if (lp && lp.rag && lp.total){
        bar = `<span class="lvlprog">${ragBar(lp.green, lp.red, lp.total)}</span>`;
      } else if (lp && lp.total){
        const pct = Math.round(lp.done / lp.total * 100);
        bar = `<span class="lvlprog">
          <span class="lvlprogbar"><i style="width:${pct}%"></i></span>
          <span class="lvlprogtxt">${lp.done} / ${lp.total} · ${pct} %</span>
        </span>`;
      }
      return `<div class="abo lvlentry${soon ? ' soon' : ''}" data-enter="${esc(l.id)}"
        role="button" tabindex="0">
        <span class="grow">
          <span class="who">${esc(name(l))}</span>
          <span class="what">${only
            ? `${esc(t('demo'))} · ${esc(plural(only.length, 'nTest'))}`
            : esc(t('fullAccess'))}</span>
          ${bar}
        </span>
        <span class="when">
          <b>${esc(remaining(ms))}</b>
          <span class="bis">${esc(t('until', { date: endsFmt(l.id) }))}</span>
        </span>
        <button class="lvlrep" data-rep="${esc(l.id)}" aria-label="${esc(t('reportBtn'))}"
          title="${esc(t('reportBtn'))}">${ICON_INFO}</button>
        <button class="lvldel" data-del="${esc(l.id)}" aria-label="${esc(t('hideCard'))}"
          title="${esc(t('hideCard'))}">${ICON_TRASH}</button>
      </div>`;
    };
    // Statistik-Leiste: Serie 🔥, gelöste Aufgaben, gemeisterte Items.
    const streak = streakDays();
    const solved = solvedCount();
    const mastered = (review && review.mastered) || 0;
    const stats = `<div class="stats">
      <div class="stat"><span class="statn">🔥 ${streak}</span><span class="statl">${esc(t('statStreak'))}</span></div>
      <div class="stat"><span class="statn">✓ ${solved}</span><span class="statl">${esc(t('statSolved'))}</span></div>
      <div class="stat"><span class="statn">⭐ ${mastered}</span><span class="statl">${esc(t('statMastered'))}</span></div>
    </div>`;

    // „Weitermachen": letzter geöffneter Teil.
    const last = load('b1.last', null);
    const contMeta = last ? [last.levelName, last.skill, last.title].filter(Boolean).join(' · ') : '';
    const cont = last ? `<button class="tile contcard" id="contbtn">
      <span class="n">▶</span>
      <span class="grow"><span style="font-weight:600">${esc(t('continueTitle'))}</span>
        <div class="meta">${esc(contMeta)}</div></span>
      <span class="chev">›</span>
    </button>` : '';

    // ausgeblendete Kurse (lokal versteckt) herausfiltern
    const hidden = load('b1.hidden', []);
    const visible = (S.levels || []).filter(l => !hidden.includes(l.id));

    app.innerHTML = `
      <h1>${esc(t('landingTitle'))}</h1>
      <p class="sub">${esc(t('landingSub'))}</p>
      ${stats}
      ${cont}
      <div class="abos">
        ${visible.map(entry).join('')}
        <button class="abo addcard" id="addcode">
          <span class="plus">+</span>
          <span class="grow"><span class="who">${esc(t('addCode'))}</span></span>
        </button>
      </div>`;
    const cb = document.getElementById('contbtn');
    if (cb) cb.onclick = () => resumeLast();
    app.querySelectorAll('[data-enter]').forEach(el => {
      const open = () => enterLevel(el.dataset.enter);
      el.onclick = e => { if (!e.target.closest('[data-del],[data-rep]')) open(); };
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
    app.querySelectorAll('[data-rep]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const l = (S.levels || []).find(x => x.id === b.dataset.rep);
      if (l) reportLevel(l);
    });
    app.querySelectorAll('[data-del]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      ask(t('hideCardAsk'), () => {
        const hid = load('b1.hidden', []);
        if (!hid.includes(b.dataset.del)) hid.push(b.dataset.del);
        save('b1.hidden', hid);
        screenHome();
      }, t('hideCard'));
    });
    const addc = document.getElementById('addcode');
    if (addc) addc.onclick = () => screenCode();
  });
}

/* Stufe öffnen: Inhalte, Cache und Merkposten hängen alle daran. Lädt bei
   Bedarf die Daten der Stufe und zeigt dann ihren Inhalt. */
async function enterLevel(id){
  if (id && id !== S.level){
    S.level = id;
    save('b1.level', id);
    Object.keys(modellCache).forEach(k => delete modellCache[k]);
    S.modell = null;
    app.innerHTML = `<div class="empty">${esc(t('moment'))}</div>`;
    try { S.index = await API.index(id); }
    catch { return void toast(t('levelFailed')); }
    S.catalog = await loadCatalog(id);
  }
  // Goethe: die Fertigkeiten kommen aus dem (einen) Test — bei Bedarf laden
  if (isPraxis() && !S.modell){ try { S.modell = await praxisTest(); } catch { S.modell = null; } }
  screenLevel();
}

/* ============ Lesematerial ============ */
/* Kein Test, keine Zeit: Texte, die die Kursleitung eingestellt hat. */
async function screenResources(){
  stopTimer();
  go('resources', () => { app.innerHTML = `<div class="empty">${esc(t('loading'))}</div>`; });
  let rows;
  try { rows = await API.resources(S.level); }
  catch { rows = null; }
  go('resources', () => {
    if (!rows || !rows.length){
      app.innerHTML = `<h1>${esc(t('material'))}</h1>
        <div class="empty">${esc(t('materialEmpty'))}</div>`;
      return;
    }
    app.innerHTML = `<h1>${esc(t('material'))}</h1>
      <p class="sub">${plural(rows.length, 'nText')}. Zum Öffnen tippen.</p>
      ${rows.map((r, i) => `<div class="blockcard">
        <button class="tile" data-res="${i}">
          <span class="grow"><span style="font-weight:600">${esc(r.title)}</span></span>
          <span class="chev">›</span>
        </button></div>`).join('')}`;
    app.querySelectorAll('[data-res]').forEach(b =>
      b.onclick = () => showResource(rows[Number(b.dataset.res)]));
  });
}

/* Sehr einfache Textdarstellung: ## Überschrift, Leerzeile trennt Absätze.
   Absichtlich kein Markdown-Parser — der Text kommt aus dem Adminbereich
   und soll als Text erscheinen, nicht als HTML. */
function showResource(r){
  go('resource', () => {
    const html = String(r.body || '').split(/\n{2,}/).map(p => {
      const t = p.trim();
      if (!t) return '';
      if (/^##\s+/.test(t)) return `<h2>${esc(t.replace(/^##\s+/, ''))}</h2>`;
      if (/^#\s+/.test(t))  return `<h2>${esc(t.replace(/^#\s+/, ''))}</h2>`;
      return `<p>${esc(t).replace(/\n/g, '<br>')}</p>`;
    }).join('');
    app.innerHTML = `<h1>${esc(r.title)}</h1>
      <div class="card readable">${html || `<p class="sub">${esc(t('empty'))}</p>`}</div>`;
  });
}

/* ============ Üben nach Abschnitt (Goethe) ============
   Statt ganzer Modelltests übt man hier Fertigkeit für Fertigkeit:
   Startseite → Lesen/Hören/Schreiben/Sprechen → Teil → alle Übungen
   des Teils, ohne Zeit und ohne Punkte. Der Stand wird gespeichert.

   Aufbau: Fertigkeit = `group` des Abschnitts · Teil = Block · Übung =
   Abschnitt (zwei Texte + Aufgaben). Jede Übung hat einen eigenen Knopf
   „Antworten anzeigen" (grün/rot), der ganze Teil einen „Zurücksetzen".
   Die Lösungen kommen erst beim Aufdecken vom Server (reveal_answers) —
   der Schlüssel bleibt bis dahin geschützt wie überall sonst.

   Nur für Goethe aktiv; telc/ÖSD/DTZ bleiben beim Modelltest-System. */
const isPraxis = () => /^goethe/.test(S.level || '');
const skillIcon = s => /hör/i.test(s) ? '🎧'
  : /schreib/i.test(s) ? '✍️' : /sprech/i.test(s) ? '🗣️' : '📖';

/* ★ Aufgaben-Anweisung (Goethe-Übung): deutscher Text bleibt LTR; bei
   arabischer/ukrainischer Oberfläche kommt eine Übersetzung darunter —
   nur als Hilfe, der deutsche Originaltext bleibt immer stehen. */
function instrBlock(txt){
  if (!txt) return '';
  let h = `<div class="instr" dir="ltr">${esc(txt)}</div>`;
  const lang = I18N.lang;
  if (isPraxis() && (lang === 'ar' || lang === 'uk') && I18N.trInstr){
    const tr = I18N.trInstr(txt);
    if (tr) h += `<div class="instr-tr" lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">${esc(tr)}</div>`;
  }
  return h;
}

/* Der (einzige) Goethe-Test, voll geladen und gecacht. */
async function praxisTest(){
  const first = S.index && S.index.modelle && S.index.modelle[0];
  return first ? loadModell(first.id) : null;
}
/* Fertigkeit eines Blocks = `group` seines ersten Abschnitts. */
const blockSkill = (m, b) => {
  const s = m.sections.find(x => x.id === (b.parts || [])[0]);
  return s ? (s.group || b.title) : b.title;
};
/* die Fertigkeiten in fester Reihenfolge, nur die vorhandenen */
function praxisSkills(m){
  const order = ['Lesen', 'Hören', 'Hörverstehen', 'Schreiben', 'Sprechen'];
  const have = [...new Set((m.blocks || []).map(b => blockSkill(m, b)))];
  return have.sort((a, c) => {
    const ia = order.findIndex(x => a.startsWith(x));
    const ic = order.findIndex(x => c.startsWith(x));
    return (ia < 0 ? 99 : ia) - (ic < 0 ? 99 : ic);
  });
}

function openSkill(skill){
  const m = S.modell;
  if (!m) return toast(t('loadFailed'));
  screenSkill(skill);
}

/* Fertigkeit → Liste der Teile (Blöcke). */
function screenSkill(skill){
  stopTimer();
  const m = S.modell;
  // Antworten im Hintergrund bewerten, dann die Teil-Balken neu zeichnen.
  gradePending().then(changed => { if (changed && S.view === 'skill') screenSkill(skill); });
  go('skill', () => {
    S.praxisSkill = skill;
    const prog   = (load('b1.praxis', {})[S.level]) || {};
    const blocks = m.blocks.filter(b => blockSkill(m, b) === skill);
    app.innerHTML = `
      <h1>${esc(skill)}</h1>
      <p class="sub">${esc(t('praxisPick'))}</p>
      ${blocks.map(b => {
        // ★ عدد التمارين + شريط ٣ ألوان (صح/خطأ/غير محلول) لهذا الـTeil.
        const secs = b.parts.map(id => m.sections.find(x => x.id === id)).filter(Boolean);
        const ids = secs.flatMap(s => (s.items || []).map(it => it.id));
        const bs = statsFor(ids);
        return `<div class="blockcard"><button class="tile" data-part="${esc(b.id)}">
          <span class="grow"><span style="font-weight:600">${esc(b.title)}</span>
            <div class="meta">${esc(plural(secs.length, 'nUebung'))}</div>
            ${ids.length ? `<span class="lvlprog">${ragBar(bs.green, bs.red, bs.total)}</span>` : ''}</span>
          <span class="chev">›</span></button></div>`;
      }).join('')}`;
    app.querySelectorAll('[data-part]').forEach(x =>
      x.onclick = () => screenPractice(x.dataset.part));
  });
}

/* Stand pro Teil: { [level]: { [blockId]: { itemId: Antwort } } } */
function praxisSave(){
  const all = load('b1.praxis', {});
  (all[S.level] ||= {})[S.praxisBlock] = { ...S.answers };
  save('b1.praxis', all);
}

/* ★ Richtig/Falsch je Aufgabe für den 3-Farben-Balken: 1 = richtig, 0 = falsch.
   Wird automatisch im Hintergrund ermittelt (gradePending) — der/die Lernende
   muss „Antworten anzeigen" nicht drücken. */
function praxStat(){ return load('b1.praxstat', {}); }
// Beim Ändern einer Antwort die alte Bewertung verwerfen → wird neu benotet.
function dropStat(id){
  const all = praxStat(); const lvl = all[S.level];
  if (lvl && lvl[id] !== undefined){ delete lvl[id]; save('b1.praxstat', all); }
}
function setPraxStat(itemId, ok){
  const all = praxStat();
  (all[S.level] ||= {})[itemId] = ok ? 1 : 0;
  save('b1.praxstat', all);
}
/* Stillschweigend bewerten: beantwortete, noch nicht bewertete Aufgaben holen
   den Lösungsschlüssel (reveal, in Blöcken) und werden mit ihm verglichen.
   Der Schlüssel wird nirgends angezeigt — nur die Statistik aktualisiert sich. */
async function gradePending(){
  if (!isPraxis() || !S.modell) return false;
  const stat = (praxStat()[S.level]) || {};
  const allAns = (load('b1.praxis', {})[S.level]) || {};
  const ans = {}; Object.values(allAns).forEach(b => Object.assign(ans, b));
  const itemOf = {};
  S.modell.sections.forEach(s => (s.items || []).forEach(it => { itemOf[it.id] = { it, sec: s }; }));
  const todo = Object.keys(ans).filter(id =>
    itemOf[id] && String(ans[id] ?? '').trim() !== '' && stat[id] === undefined);
  if (!todo.length) return false;
  const all = praxStat(); const lvl = (all[S.level] ||= {});
  let changed = false;
  for (let i = 0; i < todo.length; i += 100){
    const chunk = todo.slice(i, i + 100);
    let res; try { res = await API.reveal(chunk); } catch { res = null; }
    if (!res || !res.ok) continue;
    const by = {}; (res.answers || []).forEach(a => { if (a.id) by[a.id] = a; });
    chunk.forEach(id => {
      const a = by[id]; if (!a) return;
      const { it, sec } = itemOf[id];
      // Freies Textfeld (Formular) → tolerant (fillMatch); sonst Schlüssel-Vergleich.
      const isText = sec.format === 'formular' && !(it.options && it.options.length);
      const ok = isText ? fillMatch(ans[id], a.answer) : (ans[id] === a.answer);
      lvl[id] = ok ? 1 : 0; changed = true;
    });
  }
  if (changed) save('b1.praxstat', all);
  return changed;
}

/* Eine Übung = ein Abschnitt: seine Texte und Aufgaben verschränkt
   (renderPartBody) plus ein „Antworten anzeigen"-Knopf für die ganze Übung. */
function praxisSetHTML(sec){
  const ids = (sec.items || []).map(it => it.id);
  const gradable = sec.format !== 'writing' && ids.length;
  return `<section class="part praxisset${sec.format === 'writing' ? ' w2set' : ''}" id="part-${esc(sec.id)}">
    ${sec.title ? `<h2 class="setnum">${esc(sec.title)}</h2>` : ''}
    ${instrBlock(sec.instruction)}
    ${renderPartBody(sec)}
    ${sec.format === 'writing' ? praxisWritingHTML(sec) : ''}
    ${gradable ? `<button class="btn ghost reveal" data-reveal="${esc(sec.id)}"
      data-ids="${esc(ids.join(','))}" disabled>${esc(t('reveal'))}</button>` : ''}
  </section>`;
}

/* ★ Goethe, Schreiben Teil 2: التدريب — بلا تصحيح آلي. الطالب بيكتب
   حلّه (أو بيرفع صورة حلّه على ورقة) وبيحفظه ليرجع إله، وبيشوف نموذج
   الحلّ (Musterlösung). كله محلّي (localStorage)؛ التصحيح ممكن لاحقاً. */
function w2Load(){ return load('b1.w2', {}); }
function w2Get(id){ return (w2Load()[S.level] || {})[id] || ''; }
function w2Set(id, data){
  const all = w2Load();
  (all[S.level] ||= {})[id] = data;
  try { save('b1.w2', all); return true; } catch { return false; }
}
function w2Del(id){
  const all = w2Load();
  if (all[S.level]) delete all[S.level][id];
  try { save('b1.w2', all); } catch { /* ignore */ }
}
function w2ShotHTML(id, data){
  return `<figure class="shot"><img src="${data}" alt="Lösung">
    <button class="btn ghost sm" data-w2del="${esc(id)}">${esc(t('w2Remove'))}</button></figure>`;
}

function praxisWritingHTML(sec){
  const id = esc(sec.id);
  const hasMuster = !!sec.muster;
  const shot = w2Get(sec.id);
  return `<div class="w2">
    <div class="w2tools">
      <button class="btn" data-w2save="${id}">${esc(t('w2Save'))}</button>
      <label class="btn grey w2photo">${esc(t('w2Photo'))}
        <input type="file" accept="image/*" hidden data-w2photo="${id}"></label>
      ${hasMuster ? `<button class="btn ghost" data-w2muster="${id}">${esc(t('w2Muster'))}</button>` : ''}
    </div>
    <div class="w2shot" id="w2shot-${id}">${shot ? w2ShotHTML(id, shot) : ''}</div>
    ${hasMuster ? `<div class="muster" id="w2muster-${id}" hidden>
      <h3>${esc(t('w2MusterTitle'))}</h3><div class="body">${esc(sec.muster)}</div></div>` : ''}
  </div>`;
}

/* صورة الهاتف كبيرة — منصغّرها لقياس معقول قبل ما نخزّنها بـlocalStorage */
function w2ReadPhoto(file, cb){
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1000;
      let w = img.width, h = img.height;
      const s = Math.min(1, MAX / Math.max(w, h));
      w = Math.round(w * s); h = Math.round(h * s);
      try {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.6));
      } catch { cb(String(rd.result)); }
    };
    img.onerror = () => cb(String(rd.result));
    img.src = String(rd.result);
  };
  rd.readAsDataURL(file);
}

function bindPraxisWriting(secs){
  secs.filter(s => s.format === 'writing').forEach(sec => {
    const id = sec.id;
    const scope = document.getElementById('part-' + id);
    if (!scope) return;

    const mBtn = scope.querySelector('[data-w2muster]');
    if (mBtn) mBtn.onclick = () => {
      const box = document.getElementById('w2muster-' + id);
      if (!box) return;
      box.hidden = !box.hidden;
      mBtn.textContent = box.hidden ? t('w2Muster') : t('w2MusterHide');
    };

    const save = scope.querySelector('[data-w2save]');
    if (save) save.onclick = () => {
      praxisSave();
      toast(t('w2Saved'));
      const was = save.textContent;
      save.classList.add('saved'); save.textContent = t('w2Saved');
      setTimeout(() => { save.classList.remove('saved'); save.textContent = was; }, 1300);
    };

    const file = scope.querySelector('[data-w2photo]');
    if (file) file.onchange = () => {
      const f = file.files && file.files[0];
      if (!f) return;
      w2ReadPhoto(f, data => {
        const box = document.getElementById('w2shot-' + id);
        if (w2Set(id, data)){
          if (box) box.innerHTML = w2ShotHTML(id, data);
          bindW2Del(scope, id);
          toast(t('w2Saved'));
        } else {
          toast(t('w2TooBig'));
        }
      });
      file.value = '';
    };

    bindW2Del(scope, id);
  });
}

function bindW2Del(scope, id){
  const del = scope.querySelector('[data-w2del]');
  if (del) del.onclick = () => {
    w2Del(id);
    const box = document.getElementById('w2shot-' + id);
    if (box) box.innerHTML = '';
  };
}

/* Teil (Block) → alle Übungen, ohne Zeit/Punkte, mit Zurücksetzen. */
// Eine Übung gilt als erledigt, wenn alle ihre Aufgaben beantwortet sind.
function setDone(sec){
  const ids = (sec.items || []).map(it => it.id);
  if (!ids.length) return false;     // Schreiben/Sprechen: nicht automatisch messbar
  return ids.every(id => { const v = S.answers[id]; return v !== undefined && String(v).trim() !== ''; });
}
// Kurzes Tab-Label: die Zahl aus dem Titel (Test 94 → 94, Übung 1 → 1).
function setShort(sec){
  const num = String(sec.title || '').match(/\d+/);
  return num ? num[0] : (sec.title || '•');
}

function screenPractice(blockId, setId){
  const m = S.modell;
  const b = m && m.blocks.find(x => x.id === blockId);
  if (!b) return;
  const secs = b.parts.map(id => m.sections.find(s => s.id === id)).filter(Boolean);
  stopTimer();
  S.praxisBlock = blockId;
  S.praxisSecs = secs;              // für das Zurücksetzen-Symbol im Header
  const saved = (load('b1.praxis', {})[S.level] || {})[blockId] || {};
  S.answers = { ...saved };
  S.dropped = {}; S.checks = {};
  S.run = { id: blockId, drill: true, parts: secs, title: b.title, maxPoints: 0 };
  recordLast({ level: S.level, levelName: currentLevelName(), type: 'praxis',
               skill: S.praxisSkill, blockId, title: b.title });
  // gewählte Übung: angefragt → gemerkt → erste
  S.praxisSet = (setId && secs.some(s => s.id === setId)) ? setId
              : (secs.some(s => s.id === S.praxisSet) ? S.praxisSet
              : (secs[0] && secs[0].id));
  go('praxis', () => renderPraxis(b, secs));
}

/* ★ Statt einer langen Seite mit allen Übungen: oben eine Knopfreihe (eine
   pro Übung), unten nur die gewählte. Erledigte Übungen grün, offene neutral. */
function renderPraxis(b, secs){
  stopAudio();
  const cur = secs.find(s => s.id === S.praxisSet) || secs[0];
  const tabs = secs.map(s => `<button class="praxtab${s.id === cur.id ? ' on' : ''}${
      setDone(s) ? ' done' : ''}" data-set="${esc(s.id)}"
      title="${esc(s.title || '')}">${esc(setShort(s))}</button>`).join('');
  app.innerHTML = `
    <h1>${esc(b.title)}</h1>
    <p class="sub">${esc(t('praxisHint'))}</p>
    <div class="praxtabs">${tabs}</div>
    ${praxisSetHTML(cur)}`;
  bindInputs(cur);
  praxisBindReveal([cur]);
  bindPraxisWriting([cur]);
  bindSprechen([cur]);
  bindSprechkarten([cur]);
  praxisSyncButtons();
  document.querySelectorAll('[data-set]').forEach(btn => btn.onclick = () => {
    if (btn.dataset.set === S.praxisSet) return;
    S.praxisSet = btn.dataset.set;
    renderPraxis(b, secs);
    window.scrollTo(0, 0);
  });
  // aktiven Tab in der scrollbaren Reihe sichtbar machen (ohne die Seite zu scrollen)
  const onTab = app.querySelector('.praxtab.on');
  if (onTab) requestAnimationFrame(() =>
    onTab.scrollIntoView({ block: 'nearest', inline: 'center' }));
}
// Den aktiven Tab grün färben, sobald seine Übung komplett beantwortet ist.
function praxisSyncTab(){
  const sec = (S.praxisSecs || []).find(s => s.id === S.praxisSet);
  if (!sec || !setDone(sec)) return;
  const tab = document.querySelector('.praxtab.on');
  if (tab) tab.classList.add('done');
}

/* Antworten des ganzen Teils löschen und frisch neu zeichnen. */
function praxisReset(secs){
  secs.forEach(sec => (sec.items || []).forEach(it => {
    delete S.answers[it.id]; delete S.dropped[it.id];
  }));
  praxisSave();
  toast(t('praxisResetDone'));
  screenPractice(S.praxisBlock);
}

/* Knopf ist erst aktiv, wenn alle Aufgaben der Übung beantwortet sind. */
function praxisSyncButtons(){
  document.querySelectorAll('[data-reveal]').forEach(btn => {
    if (btn.classList.contains('done')) return;
    const ids = btn.dataset.ids.split(',').filter(Boolean);
    btn.disabled = !ids.every(id => {
      const v = S.answers[id];
      return v !== undefined && String(v).trim() !== '';
    });
  });
}

function praxisBindReveal(secs){
  const byId = {};
  secs.forEach(s => { byId[s.id] = s; });
  document.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.onclick = async () => {
      const sec = byId[btn.dataset.reveal];
      const ids = btn.dataset.ids.split(',').filter(Boolean);
      btn.disabled = true;
      const was = btn.textContent;
      btn.textContent = t('revealing');
      let res;
      try { res = await API.reveal(ids); } catch { res = null; }
      if (!res || !res.ok){
        btn.textContent = was; btn.disabled = false;
        return void toast(t('revealFailed'));
      }
      const by = {};
      (res.answers || []).forEach(a => { if (a.id) by[a.id] = a; });
      ids.forEach(id => praxisColor(id, by[id]));
      btn.textContent = t('revealed');
      btn.classList.add('done');
      // Nach dem Aufdecken bleibt die Übung stehen — kein Ändern mehr
      const set = btn.closest('.praxisset');
      if (set) set.querySelectorAll('[data-opt],[data-key]')
        .forEach(el => el.classList.add('locked'));
    };
  });
}

/* Grün = richtig, Rot = die falsch gewählte Antwort. */
/* ★ مقارنة «ذكية» لخانة النموذج: بلا حساسية لحروف كبيرة/صغيرة، بتتجاهل
   المسافات الزايدة وعلامات الترقيم، وبتقبل بدائل مفصولة بـ«|» بالحل. */
function normFill(s){
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[.,;:!?/()\[\]„""'»«]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
/* كلمات وصل صغيرة بتنتجاهل بالمقارنة تا تكون أبسط: «Englisch Chinesisch»
   بتنحسب متل «Englisch und Chinesisch». */
const FILL_STOP = new Set(['und','oder','der','die','das','den','dem','ein','eine',
  'einen','am','im','in','an','von','vom','zu','zum','zur','um','bis']);
function fillTokens(s){
  return normFill(s).split(' ').filter(w => w && !FILL_STOP.has(w)).sort().join(' ');
}
function fillMatch(mine, answer){
  const m = normFill(mine);
  if (!m) return false;
  const alts = String(answer).split('|');
  if (alts.some(alt => normFill(alt) === m)) return true;   // تطابق تام (بعد التبسيط)
  const mt = fillTokens(mine);                              // أو نفس الكلمات المهمّة
  return !!mt && alts.some(alt => fillTokens(alt) === mt);
}

function praxisColor(id, a){
  const q = document.getElementById('q_' + id);
  if (!q || !a) return;
  const mine = S.answers[id];
  const inp = q.querySelector('input[data-txt]');
  let ok;
  if (inp){                              // خانة نصّ (Formular)
    ok = fillMatch(mine, a.answer);
    inp.classList.add(ok ? 'correct' : 'wrong');
    inp.readOnly = true;
    if (!ok) q.insertAdjacentHTML('beforeend',
      `<span class="fsol">${esc(t('fSolution'))}: ${esc(String(a.answer).split('|')[0])}</span>`);
  } else {
    ok = mine === a.answer;
    q.querySelectorAll('.opt').forEach(opt => {
      const k = opt.dataset.opt.split('|')[1];
      if (k === a.answer) opt.classList.add('correct');
      else if (k === mine) opt.classList.add('wrong');
    });
    q.querySelectorAll('.key[data-key]').forEach(b => {
      const k = b.dataset.key.split('|')[1];
      if (k === a.answer) b.classList.add('correct');
      else if (k === mine) b.classList.add('wrong');
    });
  }
  q.classList.add(ok ? 'isok' : 'isbad');
  setPraxStat(id, ok);                      // صح/خطأ للشريط (مع التصحيح التلقائي كمان)
  if (a.explanation && !q.querySelector('.why'))
    q.insertAdjacentHTML('beforeend', `<div class="why">${esc(a.explanation)}</div>`);
}

/* ============ Prüfungsteile eines Modelltests ============ */
/* Die Aufgaben kommen ohne Lösungen vom Server. Die Lösungen erreichen die
   App erst nach dem Abgeben, als Antwort von submit_attempt. */
const modellCache = {};
async function loadModell(id){
  if (!modellCache[id]) modellCache[id] = await API.test(id, S.level);
  return modellCache[id];
}

async function openModell(id){
  try {
    S.modell = await loadModell(id);
  } catch {
    toast(t('loadFailed')); return;
  }
  screenModell(S.modell);
}

function screenModell(m){
  stopTimer();
  recordLast({ level: S.level, levelName: currentLevelName(), type: 'modell',
               modellId: m.id, title: m.title });
  go('modell', () => {
    const prog = load('b1.progress', {})[m.id] || {};
    const part = id => m.sections.find(s => s.id === id);

    const blocks = m.blocks.map(b => {
      const parts = b.parts.map(part).filter(Boolean);
      const n = parts.reduce((a, p) => a + p.items.length, 0);
      const r = prog[b.id];
      const saved = r && r.answers;                 // Prüfung liegt vor
      const done = r && r.points !== undefined && r.points !== null;
      const badge = `<span class="pills">
        <span class="pill">${b.minutes} Min.</span>
        ${done ? `<span class="pill ${r.pct >= 60 ? 'ok' : 'bad'}">${fmtP(r.points)}/${fmtP(r.max)}</span>` : ''}
      </span>`;
      const sub = [b.hint, plural(n, 'nTask'), `${fmtP(b.maxPoints)} ${t('pointsWord')}`,
                   b.missing ? `${plural(b.missing, 'nMissing')} ${t('inTemplate')}` : '']
        .filter(Boolean).join(' · ');
      return `<div class="blockcard">
        <button class="tile" data-block="${esc(b.id)}">
          <span class="grow"><span style="font-weight:600">${esc(b.title)}</span>
            <div class="meta">${esc(sub)}</div></span>
          ${badge}
        </button>
        ${saved ? `<div class="lastrun">
          <span>${esc(t('lastExam'))}${r.date ? ' · ' + esc(r.date) : ''}<br>
            ${done ? `${fmtP(r.points)}/${fmtP(r.max)} ${esc(t('pointsWord'))} · ${r.pct} %`
                   : esc(t('notRated'))}</span>
          <button class="btn ghost sm" data-review="${esc(b.id)}">${esc(t('view'))}</button>
          <button class="btn grey sm" data-clear="${esc(b.id)}">${esc(t('remove'))}</button>
        </div>` : ''}
      </div>`;
    }).join('');

    const total = m.blocks.reduce((a, b) => a + b.maxPoints, 0);
    app.innerHTML = `
      <h1>${esc(m.title)}</h1>
      <p class="sub">${esc(m.subtitle || '')}</p>
      ${blocks}
      <p class="sub" style="margin-top:16px">Schriftliche Prüfung insgesamt
        ${fmtP(total)} Punkte — bestanden ab ${fmtP(total * 0.6)} Punkten (60 %).</p>
      <button class="btn ghost reportbtn" id="report">
        <span class="i">ℹ</span>${esc(t('reportBtn'))}</button>`;

    app.querySelectorAll('[data-block]').forEach(b =>
      b.onclick = () => screenIntro(blockRun(m, b.dataset.block)));
    app.querySelectorAll('[data-review]').forEach(b =>
      b.onclick = () => reviewRun(m, b.dataset.review));
    app.querySelectorAll('[data-clear]').forEach(b =>
      b.onclick = () => ask(t('delLast'), () => {
        clearResult(m.id, b.dataset.clear);
        screenModell(m);
      }, t('del')));
    document.getElementById('report').onclick = () => openReport(m.uuid, examName(m));
  });
}

/* ============ Problem melden ============ */
/* Der einzige Rückkanal. Wer einen falschen Lösungsschlüssel, ein fehlendes
   Bild oder eine doppelte Aufgabe findet, ist der oder die Einzige, die es
   sieht — und hatte bisher keinen Weg, es uns zu sagen.

   ★ Der Text ist Text, nie Code.
     · Gesendet wird er als Parameter einer Funktion; nirgends wird SQL
       daraus zusammengebaut.
     · Angezeigt wird er im Panel nur durch esc() — tests/xss.mjs schießt
       eine echte Nutzlast durch diesen Weg und prüft, dass sie tot bleibt.
     · Länge, Steuerzeichen und Häufigkeit regelt die Datenbank, nicht
       dieser Bildschirm: hier prüfen heißt nur, früher „nein" zu sagen.
   ★ Welche Prüfung gemeldet wird, entscheidet ebenfalls die Datenbank —
     von hier geht nur die ID. */
function examName(m){
  const l = S.levels.find(x => x.id === S.level);
  const who = l && l.provider && l.stufe ? `${l.provider} · ${l.stufe}`
            : (l && (l.title || l.id)) || '';
  return who ? `${who} — ${m.title}` : m.title;
}

/* ★ Problem für eine ganze Stufe melden (von der Startseiten-Karte). Die
   Meldung wird an eine Prüfung dieser Stufe gebunden (erste aus dem Index),
   damit im Panel die Stufe (A1/B1 …) erkennbar ist. */
async function reportLevel(l){
  const label = l.provider && l.stufe ? `${l.provider} · ${l.stufe}` : (l.title || l.id);
  let uuid = null;
  try {
    const idx = (l.id === S.level && S.index) ? S.index : await API.index(l.id);
    uuid = idx && idx.modelle && idx.modelle[0] && idx.modelle[0].uuid;
  } catch { uuid = null; }
  if (!uuid) return toast(t('loadFailed'));
  openReport(uuid, label);
}

// uuid = Test-ID (bindet die Meldung im Panel an die richtige Prüfung/Stufe),
// label = was dem/der Nutzer·in im Dialog angezeigt wird (z. B. „DTZ · B1").
function openReport(uuid, label){
  const MIN = 10, MAX = 2000;
  const back = document.createElement('div');
  back.className = 'modalback';
  back.innerHTML = `<div class="modal report" role="dialog" aria-modal="true">
    <h2>${esc(t('reportTitle'))}</h2>
    <p>${esc(t('reportIntro', { exam: label }))}</p>
    <textarea id="rtext" maxlength="${MAX}" dir="auto"
      placeholder="${esc(t('reportPlaceholder'))}"></textarea>
    <div class="counter" id="rcount"></div>
    <div class="modalbtns">
      <button class="btn grey" data-no>${esc(t('no'))}</button>
      <button class="btn" data-yes>${esc(t('reportSend'))}</button>
    </div></div>`;
  const close = () => back.remove();
  const ta   = back.querySelector('#rtext');
  const send = back.querySelector('[data-yes]');
  const cnt  = back.querySelector('#rcount');

  const paint = () => {
    const n = ta.value.trim().length;
    cnt.textContent = n < MIN ? t('reportMin', { n: MIN }) : `${n}/${MAX}`;
    send.disabled = n < MIN;
  };
  ta.oninput = paint;
  paint();

  back.querySelector('[data-no]').onclick = close;
  // Klick daneben schließt — aber nicht, wenn schon etwas getippt ist:
  // ein halber Absatz, der durch ein Fehltippen verschwindet, wird nicht
  // noch einmal geschrieben.
  back.onclick = e => { if (e.target === back && !ta.value.trim()) close(); };

  send.onclick = async () => {
    send.disabled = true;
    const was = send.textContent;
    send.textContent = t('reportSending');
    let r;
    try { r = await API.reportProblem(uuid, ta.value.trim(), I18N.lang); }
    catch { r = { ok: false, error: 'network' }; }
    if (r && r.ok){ close(); return toast(t('reportThanks'), 3600); }
    send.textContent = was; send.disabled = false;
    toast(t({ too_short: 'reportTooShort', too_many: 'reportTooMany' }[r && r.error]
             || 'reportFailed'));
  };

  document.body.appendChild(back);
  ta.focus();
}

/* Punkte kurz schreiben: 2.5 → "2,5", 25.0 → "25" */
const fmtP = n => (Math.round(n * 10) / 10).toString().replace('.', ',');

/* „1 Aufgabe", nicht „1 Aufgaben" — deutsche Zählung an einer Stelle. */
/* الترجمة بـassets/i18n.js. plural القديمة كانت شكلين ثابتين — والعربي
   ستة أشكال والأوكراني تلاتة، فالجمع صار من I18N حسب قواعد كل لغة. */
const t = (k, v) => I18N.t(k, v);
const plural = (n, key) => I18N.plural(n, key);

/* Ein Durchgang = Titel, Zeit, Punkte und die Teile, die dazugehören. */
function blockRun(m, id){
  const b = m.blocks.find(x => x.id === id);
  const parts = b.parts.map(p => m.sections.find(s => s.id === p)).filter(Boolean);
  return { id: b.id, title: b.title, minutes: b.minutes, hint: b.hint,
           maxPoints: b.maxPoints, availablePoints: b.availablePoints,
           missing: b.missing, parts };
}
const runItems = run => run.parts.flatMap(p => p.items);

/* ★ نفس قاعدة writing_start بالسيرفر، حرفياً: بالبلوك في أكتر من قسم
   format=writing — استمارة، تلفون-نوتيتس، ورسالة. المقصود بالتصحيح هو
   يلي إله حدّ أدنى كلمات؛ وإذا ما في، أول واحد بالترتيب. لو العميل
   اختار غير ما بيختار السيرفر، الطالب بيشوف تصحيح نصّ تاني غير يلي كتبه. */
function pickWriting(parts){
  const w = parts.filter(p => p.format === 'writing');
  return w.find(p => p.items[0] && p.items[0].minWords) || w[0] || null;
}

/* تحت هالحدّ ما في شي ينصحّح — تلفون-نوتيتس بتطلع خمس كلمات. نفس الرقم
   مفروض بـwriting_start، لأنّ الحصّة بتنحرق بالسيرفر مو بالمتصفّح. */
const AI_MIN_WORDS = 12;

/* Die letzte Prüfung noch einmal ansehen — mit den damals gegebenen Antworten. */
function reviewRun(m, blockId){
  const r = (load('b1.progress', {})[m.id] || {})[blockId];
  if (!r || !r.answers) return;
  const run = blockRun(m, blockId);
  S.run = run;
  S.answers = { ...r.answers };
  S.dropped = {};
  stopTimer();
  if (run.parts.length === 1 && run.parts[0].format === 'writing')
    return screenWriting(run, r);
  // Die Lösungen stehen im gespeicherten Ergebnis — die Aufgaben selbst
  // tragen sie nie. Ältere Ergebnisse ohne results sind nicht ansehbar.
  if (!r.results) return toast(t('noSolutions'));
  applyResults(run, r.results);
  const right = r.results.filter(x => x.correct).length;
  screenResult(run, r.points, r.max, r.pct, right, runItems(run).length);
}

/* ============ Startbildschirm ============ */
function screenIntro(run){
  S.run = run;
  S.answers = {};
  S.dropped = {};
  S.plays   = {};
  // Übungen kennen weder Entwurf noch angefangene Sitzung
  const sess = run.drill ? null : loadSession(run.id);
  stopTimer();
  go('intro', () => {
    const n = runItems(run).length;
    // Der Hinweis „keine Hörtexte" gilt nur, solange kein Audio hinterlegt ist
    const notes = [...new Set(run.parts
      .filter(p => !p.audio).map(p => p.note).filter(Boolean))];
    const list = run.parts.length > 1
      ? `<ul class="partlist">${run.parts.map(p =>
          `<li><span class="grow">${esc(p.title)}</span>
             <span class="meta">${plural(p.items.length, 'nTask')} · ${fmtP(p.maxPoints)} P.</span></li>`).join('')}</ul>`
      : `<div class="instr">${esc(run.parts[0].instruction)}</div>`;

    app.innerHTML = `
      <div class="card">
        <span class="pill">${run.drill ? 'Übung' : 'Wie in der Prüfung'}</span>
        <h2 style="margin-top:10px">${esc(run.title)}</h2>
        ${run.hint ? `<p class="sub" style="margin-bottom:14px">${esc(run.hint)}</p>` : ''}
        ${list}
        ${run.missing ? `<div class="fb warn" style="margin-bottom:16px">
          In diesem Modelltest fehlen ${run.missing} Aufgaben — sie sind in der
          Vorlage abgeschnitten. Ihr Ergebnis wird auf die offiziellen
          ${fmtP(run.maxPoints)} Punkte umgerechnet.</div>` : ''}
        ${notes.map(t => `<div class="fb warn" style="margin-bottom:16px">${esc(t)}</div>`).join('')}
        <div class="row" style="gap:24px;margin-bottom:16px">
          <div><div class="meta" style="color:var(--muted);font-size:13px">${esc(t('tasks'))}</div>
               <b style="font-size:18px">${n}</b></div>
          <div><div class="meta" style="color:var(--muted);font-size:13px">${esc(t('time'))}</div>
               <b style="font-size:18px">${run.drill ? 'ohne' : run.minutes + ' Minuten'}</b></div>
          <div><div class="meta" style="color:var(--muted);font-size:13px">${run.drill ? 'Richtig zu lösen' : 'Punkte'}</div>
               <b style="font-size:18px">${fmtP(run.maxPoints)}</b></div>
        </div>
        ${sess ? `<button class="btn wide" id="resume">Prüfung fortsetzen — ${mmss(sess.left)} übrig</button>
             <button class="btn ghost wide" id="start" style="margin-top:10px">${esc(t('restart'))}</button>`
               : `<button class="btn wide" id="start">${esc(t('start'))}</button>`}
      </div>`;
    document.getElementById('start').onclick = () => {
      clearSession(run.id);
      S.answers = {}; S.dropped = {}; S.plays = {};
      screenExam(run);
    };
    const res = document.getElementById('resume');
    if (res) res.onclick = () => {
      S.answers = { ...sess.answers }; S.dropped = { ...sess.dropped };
      // ★ «كمّل» لازم ترجّع كم مرّة انشغّل الصوت كمان، مو بس الأجوبة
      S.plays = { ...(sess.plays || {}) };
      screenExam(run, sess.left);
    };
  });
}

/* ============ Prüfung ============ */
function screenExam(run, resumeLeft){
  go('exam', () => {
    const nav = run.parts.length > 1
      ? `<nav class="partnav">${run.parts.map((p, i) =>
          `<a href="#part-${esc(p.id)}">${esc(shortTitle(p.title))}</a>`).join('')}</nav>`
      : '';

    const body = run.parts.map(p => `
      <section class="part" id="part-${esc(p.id)}">
        ${run.parts.length > 1 ? `<h2 class="parthead">${esc(p.title)}</h2>
          <div class="instr">${esc(p.instruction)}</div>` : ''}
        ${renderPartBody(p)}
      </section>`).join('');

    app.innerHTML = nav + body +
      `<div class="bottombar">
         <div class="progbar"><i id="progfill"></i></div>
         <div class="inner">
         <span class="progress" id="prog"></span>
         <button class="btn grey" id="pause">${esc(t('pause'))}</button>
         <button class="btn grow" id="submit">${esc(t('submit'))}</button>
       </div></div>`;

    run.parts.forEach(p => bindInputs(p));
    updateProgress();
    markCurrentPart();
    /* الوقت محدود والزرّ كبير — التسليم بالغلط بيصير. لو في أسئلة بلا
       إجابة، منسأل ومنقول كم، بدل ما نسلّم بصمت. */
    document.getElementById('submit').onclick = () => {
      const items = runItems(run);
      const open  = items.length - items.filter(answered).length;
      if (!open) return finish(run, false);
      ask(t('openAsk', { n: plural(open, 'nOpen') }),
          () => finish(run, false), t('submitAnyway'), t('keepGoing'));
    };
    const pz = document.getElementById('pause');
    if (run.drill) { pz.remove(); stopTimer(); }     // Übung läuft ohne Uhr
    else {
      pz.onclick = () => pauseExam(run);
      startTimer(resumeLeft || run.minutes * 60,
                 () => { toast(t('timeUp')); finish(run, true); });
    }
  });
}

/* Der Teil, in dem man gerade liest, wird in der Sprungleiste markiert.
   Ein einziger Zuhörer fürs Scrollen, der nichts tut, wenn keine Leiste da ist. */
function markCurrentPart(){
  const links = [...document.querySelectorAll('.partnav a')];
  if (!links.length) return;
  const line = 130;                    // knapp unter Kopf- und Sprungleiste
  let cur = 0;
  links.forEach((a, i) => {
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (el && el.getBoundingClientRect().top <= line) cur = i;
  });
  links.forEach((a, i) => a.classList.toggle('active', i === cur));
}

/* Beim Antworten springt die Markierung sofort auf den Teil, in dem
   die Aufgabe steht — man sieht also, wo man gerade löst. */
function markPart(partId){
  const links = [...document.querySelectorAll('.partnav a')];
  links.forEach(a => a.classList.toggle('active',
    a.getAttribute('href') === '#part-' + partId));
}

let markRaf = 0;
addEventListener('scroll', () => {
  if (!markRaf) markRaf = requestAnimationFrame(() => { markRaf = 0; markCurrentPart(); });
}, { passive: true });

const shortTitle = t => t.replace('Leseverstehen', 'LV').replace('Sprachbausteine', 'SB')
                         .replace('Hörverstehen', 'HV').replace(', Teil ', ' ');

/* ★ فحوص سريعة بلا ذكاء اصطناعي.
   هدول أشياء بينفحصوا بالعدّ والمطابقة، ما بدهن حكم: عدد الكلمات،
   في تحية بالأول، في سلام بالآخر. مجانية، فورية، وما بتغلط.

   يلي **ما** منحطّه هون: هل النقاط الأربعة انكتبت فعلاً. هاد بده فهم
   للنص، ومطابقة كلمات بتعطي جواب غلط بثقة — فمنعرضهن كقائمة الطالب
   بيشطب عليها بإيده. صادقة أكتر من تخمين ملبّس.

   والإملاء متروك للمتصفّح: lang="de" على الحقل بيخلّي المدقّق يسطّر
   الكلمات الغلط وهو عم يكتب. مجاني ومبني بالمتصفّح. */
const GREET = /^\s*(liebe[rs]?\b|hallo\b|hi\b|sehr\s+geehrte[rs]?\b|guten\s+(tag|morgen|abend)\b)/i;
const CLOSE = /(viele|liebe|herzliche|beste|freundliche)\s+gr(ü|ue)(ß|ss)e|mit\s+freundlichen\s+gr(ü|ue)(ß|ss)en|bis\s+bald|tsch(ü|ue)ss|dein[e]?\b|ihr[e]?\b/i;

const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/* ★ Goethe Teil 2: بدل قائمة التحقّق الكاملة — بس عدّاد كلمات كـlabel. */
function wordLabelHTML(it, text){
  const n = wordCount(text);
  const min = (it && it.minWords) || 0;
  const low = min && n < min;
  return `<div class="wlabel${low ? ' low' : ''}">${n} ${esc(t('wordsLabel'))}${
    low ? ` <span class="sub">(${esc(t('minWords', { min }))})</span>` : ''}</div>`;
}

/* قائمة التحقّق (امتحان) أو عدّاد الكلمات (تمرين غوته) */
function writingAside(it, text){
  return isPraxis() ? wordLabelHTML(it, text) : checksHTML(it, text);
}

function checksHTML(it, text){
  const n    = wordCount(text);
  // ★ نفس الغلط يلي كان بشاشة النتيجة: `|| 100` كان بيطالب طالب A1
  //   بمئة كلمة باستمارة من خمس خانات. اللي ما إله حدّ ما بينعرضله سطر.
  const min  = it.minWords || 0;
  const body = String(text || '');
  const tail = body.slice(-140);          // السلام بيكون بالآخر، مو بأي مطرح
  const pts  = it.points || [];
  const done = (S.checks && S.checks[it.id]) || [];

  const row = (ok, label) => `<li class="${ok ? 'ok' : ''}">
    <span class="mark">${ok ? '✓' : '○'}</span>${esc(label)}</li>`;

  return `<div class="checks">
    <h3>${esc(t('checksTitle'))}</h3>
    <ul>
      ${min ? row(n >= min, t('chkWords', { n, min })) : ''}
      ${row(GREET.test(body), t('chkGreeting'))}
      ${row(CLOSE.test(tail), t('chkClosing'))}
    </ul>
    ${pts.length ? `<p class="sub">${esc(t('chkPointsHint'))}</p>
      <ul class="pts">
        ${pts.map((p, i) => `<li>
          <label><input type="checkbox" data-pt="${esc(it.id)}|${i}"
            ${done[i] ? 'checked' : ''}> ${esc(p)}</label></li>`).join('')}
      </ul>` : ''}
  </div>`;
}

function renderBrief(sec){
  /* ★ «brief» شكل telc B1 لحاله: رسالة واردة بتحية وفقرات وتوقيع.
     ÖSD وGoethe وDTZ وtelc B2 بيحطّوا نصّ المهمّة بـpassages، وما عندهن
     brief أصلاً — فـ`b.intro` كانت ترمي TypeError والشاشة تطلع بيضا.
     ونفس الشي لـpoints وminWords: اللي مو موجود ما بينعرض. */
  const b = sec.brief, it = sec.items[0] || {};
  const pts = it.points || [];
  return `
    ${b ? `
    ${b.intro ? `<p class="briefintro">${esc(b.intro)}</p>` : ''}
    <div class="brief">
      ${b.greeting ? `<p class="anrede">${esc(b.greeting)}</p>` : ''}
      ${(b.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join('')}
      ${b.signature ? `<p class="sig">${esc(b.signature)}</p>` : ''}
    </div>` : ''}
    <div class="task">
      ${sec.instruction ? `<p>${esc(sec.instruction)}</p>` : ''}
      ${pts.length ? `<ul>${pts.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      ${(sec.hints || []).map(h => `<p class="hint">${esc(h)}</p>`).join('')}
      ${(it.minWords && !(sec.hints || []).some(h => /mindestens/i.test(h)))
        ? `<p class="hint">Schreiben Sie mindestens ${it.minWords} Wörter.</p>` : ''}
    </div>`;
}

/* ============ Hörverstehen ============
   Wie in der Prüfung: begrenzt oft abspielbar, kein Vor- und Zurückspulen.
   Der Text steht daneben erst nach der Abgabe. */
function renderAudio(sec){
  if (!sec.audio) return '';
  const slot = `au_${Math.random().toString(36).slice(2)}`;
  const plays = Math.max(1, Number(sec.audioPlays) || 1);

  API.audioUrl(sec.audio).then(url => {
    const el = document.getElementById(slot);
    if (!el) return;
    if (!url){ el.innerHTML = `<p class="sub">${esc(t('audioFailed'))}</p>`; return; }

    /* ★ الحدّ بيتحمّل بالجلسة، مو بمتغيّر بالشاشة. كان `let left = plays`
       جوّا الرسم: أي إعادة رسم بترجّعه للأول — «وقف الامتحان» وبعدين
       «كمّل» بتعطي تشغيلتين جداد كل مرّة، والحدّ يلي المفروض يشبه
       الامتحان الحقيقي بيصير بلا معنى.
       وبعد التسليم الحدّ بينشال: الامتحان خلص، والمراجعة مو امتحان. */
    // ★ بوضع التمرين (Goethe): مشغّل عادي — تشغيل/إيقاف، بلا حدّ، وتقدر تسحب.
    //   بوضع الامتحان والمحاكاة: متل الفحص الحقيقي — ما تقدر تسحب ولا توقف،
    //   وكل تشغيلة من الأول. الفرق: الفحص الحقيقي بيحدّ التشغيلات،
    //   والمحاكاة لأ (التسجيل بيعيد كل نص مرّتين بالأصل، فحدّ ٢× بيصير مكرّر).
    // Freier Player nur im Übungsmodus. In Prüfung UND Simulation: kein
    // Zurückspulen, keine Pause. Unterschied: die echte Prüfung begrenzt die
    // Wiedergaben (mit Zähler), die Simulation nicht (ohne Zähler).
    const isSim = !!(S.run && S.run.sim);
    const freePlayer = S.view !== 'exam';

    el.innerHTML = `
      <button class="btn" data-play></button>
      <span class="sub" data-left></span>
      <div class="audiobar"><i></i></div>`;
    const audio = new Audio(url);
    audio.preload = 'auto';
    LIVE.add(audio);
    // ★ صوت واحد بس بينشتغل: أول ما يبلّش أي تسجيل، نوقّف الباقيين — تا ما
    //   يشتغلوا كذا صوت سوا ويصير ضجّة (بالتمرين وبالامتحان سوا).
    audio.addEventListener('play', () => {
      for (const a of LIVE) if (a !== audio) { try { a.pause(); } catch {} }
    });
    const btn  = el.querySelector('[data-play]');
    const info = el.querySelector('[data-left]');
    const barWrap = el.querySelector('.audiobar');
    const bar  = barWrap.querySelector('i');

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
    });

    if (freePlayer){
      // ── Übungsmodus: freier Player ──
      const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
      const paint = () => {
        btn.textContent = audio.paused
          ? (audio.currentTime > 0 && !audio.ended ? t('audioResume') : t('audioPlay'))
          : t('audioPause');
        info.textContent = audio.duration ? `${fmt(audio.currentTime)} / ${fmt(audio.duration)}` : '';
      };
      btn.onclick = () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); };
      ['play','pause','timeupdate','loadedmetadata','ended'].forEach(ev => audio.addEventListener(ev, paint));
      audio.addEventListener('ended', () => { bar.style.width = '100%'; });
      barWrap.style.cursor = 'pointer';
      barWrap.onclick = e => {
        if (!audio.duration) return;
        const r = barWrap.getBoundingClientRect();
        audio.currentTime = Math.min(audio.duration, Math.max(0, (e.clientX - r.left) / r.width * audio.duration));
      };
      paint();
      return;
    }

    // ── Prüfungs-/Simulationsmodus: kein Zurückspulen, keine Pause ──
    let used = S.plays[sec.id] || 0;
    // Simulation: nie „aufgebraucht" (unbegrenzt), echte Prüfung: plays − used.
    const left = () => isSim ? 1 : Math.max(0, plays - used);
    const paint = (running) => {
      const n = left();
      btn.disabled = running || n <= 0;
      btn.textContent = running ? t('audioRunning')
                      : n <= 0 ? t('audioDone')
                      : used === 0 ? t('audioPlay') : t('audioAgain');
      // In der Simulation kein Zähler — die Aufnahme läuft wie in der Prüfung.
      info.textContent = isSim ? '' : (n > 0 ? plural(n, 'audioLeft') : t('audioNone'));
    };
    paint(false);
    audio.addEventListener('ended', () => { bar.style.width = '100%'; paint(false); });
    // Läuft die Aufnahme (auch beim automatischen Fortsetzen nach einer
    // Pause), den Knopf als „läuft" sperren; beim Anhalten wieder freigeben.
    audio.addEventListener('play',  () => paint(true));
    audio.addEventListener('pause', () => { if (!audio.ended) paint(false); });

    // In der Simulation wird der Verbrauch nicht gespeichert (unbegrenzt),
    // `used` dient dort nur der Beschriftung (Abspielen → Nochmal).
    const spend = (n) => { used += n; if (!isSim){ S.plays[sec.id] = used; saveSession(S.run); } };

    btn.onclick = () => {
      if (left() <= 0) return;
      // ★ الحصّة بتنحسب عند الضغط، مو عند نهاية التسجيل: وإلا الطالب
      //   بيسمع نصّه وبيطلع من الشاشة، وبيرجع بتشغيلة كاملة بجيبته.
      spend(1);
      paint(true);
      // kein Zurückspulen: jede Wiedergabe startet von vorn und läuft durch
      audio.currentTime = 0;
      audio.play().catch(() => {
        spend(-1);                       // ما اشتغل فعلاً — ما بتنحسب
        paint(false);
        info.textContent = t('audioFail');
      });
    };
  }).catch(() => {});

  return `<div class="audio" id="${slot}"><p class="sub">${esc(t('audioLoading'))}</p></div>`;
}

/* ★ متن القسم: النصوص والأسئلة سوا.
   المصدر بيكتب نص ← أسئلته ← نص تاني ← أسئلته (متل Goethe A1: نص أول
   مع سؤال ١،٢ وبعدين نص تاني مع ٣،٤،٥). كل فقرة نصّ عندها مرساة
   `before` = عدد الأسئلة يلي قبلها، فمنعرضها بمطرحها الصحيح.

   الحالات يلي ما بتتداخل (brief تبع telc B1، والهورتكست بالامتحان،
   والقسم بلا نصوص) بتضل متل قبل: كل شي فوق بعدين الأسئلة. القديم
   (نصوص بلا `before`) مرساته صفر فبيطلع كله فوق — نفس السلوك السابق. */
function renderPartBody(sec){
  const items = sec.items || [];
  const itemsHTML = () => items.map(it => renderItem(sec, it)).join('');

  // Goethe/telc, Schreiben Teil 1: نموذج (Formular) يعبّيه الطالب
  if (sec.format === 'formular') return renderFormular(sec);

  // Goethe, Sprechen Teil 1: التعريف بالنفس — بطاقات قلب + سؤال عشوائي
  if (sec.format === 'vorstellen') return renderVorstellen(sec);

  // Goethe, Sprechen Teil 2: كروت موضوع/كلمة — تسحب كرت وتكوّن سؤال
  if (sec.format === 'sprechkarten') return renderSprechkarten(sec);

  // brief / هورتكست بالامتحان / بلا نصوص: ما في تداخل — متل قبل تماماً
  if (sec.brief || (sec.audio && S.view === 'exam')
      || !sec.passages || !sec.passages.length)
    return renderPassages(sec) + renderBank(sec) + itemsHTML();

  const ps = sec.passages;
  /* ★ Goethe/telc, Lesen Teil 3: كل نص لافتة/إعلان صغير داخل إطار (Schild).
     العنوان (الموقف: «Im Restaurant» …) بيطلع فوق الإطار كـcaption، ومتن
     اللافتة جوّا الإطار متوسّط، وأوّل سطر fett = عنوان اللافتة. */
  const schild = sec.stil === 'schild';
  const passHTML = schild
    ? p => `<div class="schildwrap">
        ${p.cap ? `<div class="schildcap">${esc(p.cap)}</div>` : ''}
        <div class="schild">${(p.paragraphs || []).map(x =>
          `<p${x.b ? ' class="h"' : ''}>${esc(x.t)}</p>`).join('')}</div>
      </div>`
    : p => `<div class="passage">
      ${p.title ? `<h3>${esc(p.title)}</h3>` : ''}
      ${(p.paragraphs || []).map(x =>
        `<p${x.b ? ' class="strong"' : ''}>${esc(x.t)}</p>`).join('')}
    </div>`;

  let out = renderAudio(sec) + renderBank(sec);   // الصوت والاختيارات فوق
  let pi = 0;
  const flush = upto => { while (pi < ps.length && (ps[pi].before ?? 0) <= upto) out += passHTML(ps[pi++]); };
  flush(0);                                       // نص قبل السؤال الأول
  items.forEach((it, idx) => {
    if (idx) flush(idx);                          // نص متداخل قبل هالسؤال
    out += renderItem(sec, it);
  });
  flush(items.length);                            // نصوص بالآخر (لو في)
  return out;
}

/* ★ Schreiben Teil 1 — نموذج تسجيل (Formular) مثل الفحص الحقيقي.
   التخطيط بـsec.form.rows: كل صف إمّا قيمة مُعطاة (val) أو خانة فاضية
   (blank:N) يعبّيها الطالب. الخانة بتوصل لسؤال id=N: لو إلو خيارات =
   صندوق اختيار، وإلا = خانة نصّ. الحلول بتضل بالسيرفر (reveal_answers)،
   والتلوين أخضر/أحمر بيصير بـpraxisColor بعد ما يضغط «Lösung». */
function renderFormular(sec){
  const form = sec.form || {};
  // ★ الربط برقم الخانة (num = item_id تبع المحتوى: «1».. «5»)، مو بالـid.
  //   بالتطبيق الحيّ id = UUID من القاعدة، فالربط لازم يكون على num.
  const byId = {};
  (sec.items || []).forEach(it => { byId[String(it.num ?? it.id)] = it; });

  const scenario = (sec.passages && sec.passages.length)
    ? sec.passages.map(p => (p.paragraphs || []).map(x =>
        `<p${x.b ? ' class="strong"' : ''}>${esc(x.t)}</p>`).join('')).join('')
    : '';

  const blankHTML = it => {
    if (!it) return '<span class="fval"></span>';
    const id = esc(it.id);
    if (it.options && it.options.length){
      const chosen = S.answers[it.id];
      return `<span class="q fchoice" id="q_${id}"><span class="opts inline">${
        it.options.map(o => `<label class="opt${o.key === chosen ? ' sel' : ''}"
          data-opt="${id}|${esc(o.key)}">
          <input type="radio" name="q_${id}" value="${esc(o.key)}"${o.key === chosen ? ' checked' : ''}>
          <span class="grow">${esc(o.text)}</span></label>`).join('')}</span></span>`;
    }
    const draft = S.answers[it.id] || '';
    return `<span class="q ffill" id="q_${id}"><input type="text" class="finput"
      data-txt="${id}" lang="de" dir="auto" autocomplete="off"
      value="${esc(draft)}" placeholder="…"></span>`;
  };

  const rows = (form.rows || []).map(r => {
    const num  = r.blank ? ` <span class="fnum">(${esc(r.blank)})</span>` : '';
    const val  = r.val != null ? `<span class="fval given">${esc(r.val)}</span>` : '';
    const fill = r.blank ? blankHTML(byId[String(r.blank)]) : '';
    return `<div class="frow"><span class="flabel">${esc(r.label || '')}${num}</span>
      <span class="fcell">${val}${fill}</span></div>`;
  }).join('');

  return `${scenario ? `<div class="formscenario">${scenario}</div>` : ''}
    <div class="formcard">
      <div class="formhd">${form.title ? `<div class="formtitle">${esc(form.title)}</div>` : ''}
        ${form.subtitle ? `<div class="formsub">${esc(form.subtitle)}</div>` : ''}</div>
      <div class="formrows">${rows}</div>
    </div>`;
}

/* ★ Goethe, Sprechen Teil 1 — Sich vorstellen (مادة مرجعية، بلا تصحيح).
   بطاقات بتنقلب لتبيّن جملة نموذجية لكل كلمة مفتاح، + «نرد» بيرمي سؤال
   عشوائي من أسئلة الفاحص مع إمكانية إظهار جواب نموذجي. */
function renderVorstellen(sec){
  const id = esc(sec.id);
  const cards = sec.cards || [];
  const flips = cards.map((c, i) => `<button class="flip" type="button" data-flip="${i}">
      <span class="flipin">
        <span class="fface ffront">${esc(c.q)}</span>
        <span class="fface fback">${esc(c.a)}</span>
      </span></button>`).join('');
  const hasQ = (sec.fragen || []).length;
  return `<div class="sprechen">
    ${instrBlock(sec.note)}
    <p class="sub">${esc(t('spCardsHint'))}</p>
    <div class="flipgrid">${flips}</div>
    ${hasQ ? `<div class="spquiz" id="spq-${id}">
      <h3>🎲 ${esc(t('spQuizTitle'))}</h3>
      <div class="qcard"><p class="spqtext">${esc(t('spTapDice'))}</p>
        <p class="spqans" hidden></p></div>
      <div class="sptools">
        <button class="btn" type="button" data-spnew="${id}">🎲 ${esc(t('spNewQ'))}</button>
        <button class="btn ghost" type="button" data-spans="${id}" hidden>${esc(t('spShowA'))}</button>
      </div>
    </div>` : ''}
  </div>`;
}

/* ★ Goethe, Sprechen Teil 2 — كروت (Thema + Stichwort)، مادة مرجعية بلا تصحيح.
   الطالب يسحب كرت فيه موضوع وكلمة مفتاح، يكوّن منها سؤال، والشريك يجاوب.
   بعدها يقدر يشوف سؤال وجواب نموذجي. في فلتر حسب الموضوع. */
function renderSprechkarten(sec){
  const id = esc(sec.id);
  const karten = sec.karten || [];
  const themes = [];
  karten.forEach(k => { if (k.thema && !themes.includes(k.thema)) themes.push(k.thema); });
  const chips = themes.length > 1
    ? `<div class="spthemes" role="group" aria-label="${esc(t('spThema'))}">
        <button class="spchip on" type="button" data-sptheme="*">${esc(t('spKartenAll'))}</button>
        ${themes.map(th => `<button class="spchip" type="button" data-sptheme="${esc(th)}">${esc(th)}</button>`).join('')}
      </div>`
    : '';
  const hint = themes.length > 1 ? 'spKartenHint' : 'spBittenHint';
  return `<div class="sprechen sp2" id="spk-${id}">
    ${instrBlock(sec.note)}
    <p class="sub">${esc(t(hint))}</p>
    ${chips}
    <div class="spcard empty">
      <div class="spcardthema"><span class="spthemalbl">${esc(t('spThema'))}</span><span class="spthemaval"></span></div>
      <div class="spcardwort">${esc(t('spTapCard'))}</div>
    </div>
    <div class="spreveal">
      <p class="spqline" hidden><span class="splbl">❓</span><span class="spqtext2"></span></p>
      <p class="spaline" hidden><span class="splbl">💬</span><span class="spatext"></span></p>
    </div>
    <div class="sptools">
      <button class="btn" type="button" data-spdraw="${id}">🎴 ${esc(t('spDraw'))}</button>
      <button class="btn ghost" type="button" data-spq="${id}" hidden>${esc(t('spShowQ'))}</button>
      <button class="btn ghost" type="button" data-spa="${id}" hidden>${esc(t('spShowA'))}</button>
    </div>
  </div>`;
}

function bindSprechkarten(secs){
  secs.filter(s => s.format === 'sprechkarten').forEach(sec => {
    const scope = document.getElementById('part-' + sec.id);
    if (!scope) return;
    const karten = sec.karten || [];
    if (!karten.length) return;

    const box    = scope.querySelector('#spk-' + sec.id);
    const card   = box.querySelector('.spcard');
    const themaV = box.querySelector('.spthemaval');
    const wortEl = box.querySelector('.spcardwort');
    const themaBox = box.querySelector('.spcardthema');
    const qLine  = box.querySelector('.spqline');
    const aLine  = box.querySelector('.spaline');
    const qTxt   = box.querySelector('.spqtext2');
    const aTxt   = box.querySelector('.spatext');
    const dBtn   = box.querySelector('[data-spdraw]');
    const qBtn   = box.querySelector('[data-spq]');
    const aBtn   = box.querySelector('[data-spa]');
    let filter = '*', last = -1;

    box.querySelectorAll('[data-sptheme]').forEach(chip => chip.onclick = () => {
      filter = chip.dataset.sptheme;
      box.querySelectorAll('[data-sptheme]').forEach(c => c.classList.toggle('on', c === chip));
    });

    dBtn.onclick = () => {
      const pool = karten
        .map((k, i) => i)
        .filter(i => filter === '*' || karten[i].thema === filter);
      if (!pool.length) return;
      let pick = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1 && pick === last)
        pick = pool[(pool.indexOf(pick) + 1) % pool.length];
      last = pick;
      const k = karten[pick];
      card.classList.remove('empty');
      themaV.textContent = k.thema || '';
      if (themaBox) themaBox.hidden = !k.thema;
      wortEl.textContent = k.wort || '';
      qTxt.textContent = k.frage || '';
      aTxt.textContent = k.antwort || '';
      qLine.hidden = true;
      aLine.hidden = true;
      qBtn.hidden = !k.frage;   qBtn.textContent = t('spShowQ');
      aBtn.hidden = !k.antwort; aBtn.textContent = t('spShowA');
    };
    qBtn.onclick = () => {
      qLine.hidden = !qLine.hidden;
      qBtn.textContent = t(qLine.hidden ? 'spShowQ' : 'spHideQ');
    };
    aBtn.onclick = () => {
      aLine.hidden = !aLine.hidden;
      aBtn.textContent = t(aLine.hidden ? 'spShowA' : 'spHideA');
    };
  });
}

function bindSprechen(secs){
  secs.filter(s => s.format === 'vorstellen').forEach(sec => {
    const scope = document.getElementById('part-' + sec.id);
    if (!scope) return;

    scope.querySelectorAll('[data-flip]').forEach(btn =>
      btn.onclick = () => btn.classList.toggle('flipped'));

    const fragen = sec.fragen || [];
    if (!fragen.length) return;
    const box  = scope.querySelector('#spq-' + sec.id);
    const qEl  = box.querySelector('.spqtext');
    const aEl  = box.querySelector('.spqans');
    const nBtn = box.querySelector('[data-spnew]');
    const aBtn = box.querySelector('[data-spans]');
    let last = -1;

    nBtn.onclick = () => {
      let i = Math.floor(Math.random() * fragen.length);
      if (fragen.length > 1 && i === last) i = (i + 1) % fragen.length;
      last = i;
      qEl.textContent = fragen[i].q;
      aEl.textContent = fragen[i].a || '';
      aEl.hidden = true;
      aBtn.hidden = !fragen[i].a;
      aBtn.textContent = t('spShowA');
    };
    aBtn.onclick = () => {
      aEl.hidden = !aEl.hidden;
      aBtn.textContent = t(aEl.hidden ? 'spShowA' : 'spHideA');
    };
  });
}

function renderPassages(sec){
  if (sec.brief) return renderBrief(sec);
  // Bei einem echten Hörtext ist das Transkript die Lösung — während der
  // Prüfung bleibt es weg, in der Auswertung darf es erscheinen.
  if (sec.audio && S.view === 'exam') return renderAudio(sec);
  if (!sec.passages || !sec.passages.length) return renderAudio(sec);
  return renderAudio(sec) + sec.passages.map(p => `
    <div class="passage">
      ${p.title ? `<h3>${esc(p.title)}</h3>` : ''}
      ${(p.paragraphs || []).map(x =>
        `<p${x.b ? ' class="strong"' : ''}>${esc(x.t)}</p>`).join('')}
    </div>`).join('');
}

function renderBank(sec){
  if (sec.bankImage){
    // Die Anzeigen sind Prüfungsinhalt wie die Aufgaben: sie liegen in einem
    // privaten Bucket und werden über eine signierte URL nachgeladen.
    const slot = `img_${Math.random().toString(36).slice(2)}`;
    API.imageUrl(sec.bankImage).then(url => {
      const el = document.getElementById(slot);
      if (!el) return;
      if (!url) return void (el.textContent = t('adsFailed'));
      el.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener">
        <img src="${esc(url)}" alt="Anzeigen" class="bankimg"></a>`;
    }).catch(() => {});
    return `<div class="bank"><h3>${esc(sec.bankTitle || 'Anzeigen')}</h3>
      <p class="sub" style="margin:0 0 10px">${esc(t('imgTap'))}</p>
      <div id="${slot}" class="bankslot">${esc(t('imgLoading'))}</div></div>`;
  }
  if (!sec.bank || !sec.bank.length) return '';
  return `<div class="bank"><h3>${esc(sec.bankTitle || 'Auswahl')}</h3>
    <ul>${sec.bank.map(o =>
      `<li><span class="k">${esc(o.key)}</span>${esc(o.text)}</li>`).join('')}</ul></div>`;
}

/* ★ Goethe, Lesen Teil 2: jede Wahl ist eine Anzeige / Mini-Website.
   Der Optionstext ist „Kopf — Rumpf": beginnt der Kopf mit einer URL,
   wird die Anzeige wie ein kleines Browserfenster gezeichnet, sonst wie
   eine Anzeige mit Titel. Trennzeichen ist der Geviertstrich „ — "
   (im Rumpf kommen nur Halbgeviert „ – " und Punkte vor). Kein Treffer
   → normale Option. */
function adParts(text){
  const s = String(text || '').trim();
  let m = s.match(/^((?:https?:\/\/|www\.)[^\s—:]+)\s*[—:]\s*([\s\S]*)$/);
  if (m) return { bar: m[1], body: m[2].trim(), web: true };
  m = s.match(/^((?:https?:\/\/|www\.)\S+)\s+([\s\S]+)$/);
  if (m) return { bar: m[1], body: m[2].trim(), web: true };
  m = s.match(/^(.+?)\s+—\s+([\s\S]+)$/);
  if (m) return { bar: m[1].trim(), body: m[2].trim(), web: false };
  return null;
}

/* Anzeigentext mehrzeilig: „|" trennt Zeilen, **…** ist fett, eine Zeile
   mit •/►/- davor wird zum Aufzählungspunkt. So liest sich die Anzeige wie
   im Original, nicht wie ein Fließtext. */
function adBodyHTML(body){
  return String(body || '').split('|').map(seg => {
    let s = seg.trim();
    if (!s) return '';
    let cls = 'wcline';
    if (/^[•►\-]\s+/.test(s)){ s = s.replace(/^[•►\-]\s+/, ''); cls += ' bullet'; }
    s = esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    return `<span class="${cls}">${s}</span>`;
  }).join('');
}

function renderItem(sec, it){
  const head = `<div class="qhead"><span class="qnum">${esc(it.num || it.id)}</span>
    <span class="qtext grow">${esc(it.text)}</span></div>`;
  let body = '';

  if (sec.format === 'writing'){
    const draft = S.answers[it.id] || '';
    return `<div class="q" id="q_${esc(it.id)}">
      <textarea data-txt="${esc(it.id)}" lang="de" spellcheck="true"
        placeholder="${esc(t('writePlaceholder'))}">${esc(draft)}</textarea>
      <div id="chk_${esc(it.id)}">${writingAside(it, draft)}</div>
    </div>`;
  }
  if (sec.format === 'mc' || sec.format === 'truefalse'){
    const opts = sec.format === 'truefalse'
      ? [{ key: 'r', text: 'Richtig' }, { key: 'f', text: 'Falsch' }]
      : (it.options || []);
    /* ★ سؤال بلا خيارات كان بيعمل undefined.map — شاشة بيضا، وما بتعرف
       وين ولا ليش. هلق بيقول شو ناقص بمطرحه. */
    if (!opts.length)
      return `<div class="q isbad" id="q_${esc(it.id)}">${head}
        <p class="sub">${esc(t('itemBroken'))}</p></div>`;
    // صح-خطأ جوّا قسم mc (DTZ): نفس الشكل المضغوط تبع قسم الصح-خطأ
    const tf = sec.format === 'truefalse'
            || (opts.length === 2 && opts[0].key === 'r' && opts[1].key === 'f');
    const chosen = S.answers[it.id];
    const gone = S.dropped[it.id] || [];
    const anz = isPraxis() && !tf;        // Goethe Teil 2: Anzeigen zeichnen
    body = `<div class="opts${tf ? ' inline' : ''}${anz ? ' cards' : ''}">${
      opts.map(o => {
        const ad = anz ? adParts(o.text) : null;
        const inner = ad
          ? `<span class="wc${ad.web ? ' web' : ''}"><span class="wcbar">${esc(ad.bar)}</span>${
              ad.body ? `<span class="wcbody">${adBodyHTML(ad.body)}</span>` : ''}</span>`
          : `<span class="grow">${esc(o.text)}</span>`;
        const kl = ad ? String(o.key).toLowerCase() : o.key;
        return `<label class="opt${ad ? ' webcard' : ''}${o.key === chosen ? ' sel' : ''}${
          gone.includes(o.key) ? ' dropped' : ''}" data-opt="${esc(it.id)}|${esc(o.key)}">
        <input type="radio" name="q_${esc(it.id)}" value="${esc(o.key)}"${o.key === chosen ? ' checked' : ''}>
        <span class="k">${esc(kl)}</span>${inner}
      </label>`; }).join('')}</div>`;
  }
  else if (sec.format === 'matching' || sec.format === 'wordbank'){
    const chosen = S.answers[it.id] || '';
    /* أزرار حروف بدل قائمة منسدلة.
       القائمة بتطلب: ضغطة، قراءة، تمرير، إصابة — وبخمستعشر خيار على
       موبايل هاد صعب لمين مو متعوّد. الأزرار بتبيّن كل الحروف مرة وحدة
       وبتنضغط بضغطة. ونصّ البنك أصلاً معروض فوق الأسئلة. */
    body = `<div class="keys" data-keys="${esc(it.id)}" role="group">${
      sec.bank.map(o => `<button type="button" class="key${
        o.key === chosen ? ' sel' : ''}" data-key="${esc(it.id)}|${esc(o.key)}"
        title="${esc(o.text || o.key)}">${esc(o.key)}</button>`).join('')}
      ${chosen ? `<button type="button" class="key clr" data-key="${esc(it.id)}|"
        title="${esc(t('choose'))}">✕</button>` : ''}
    </div>`;
  }
  return `<div class="q" id="q_${esc(it.id)}">${head}${body}</div>`;
}

/* In Zuordnungsaufgaben passt jede Antwort nur einmal ("Jede Überschrift /
   jedes Wort passt nur einmal"). Schon vergebene Antworten werden in den
   anderen Aufgaben gesperrt. Ausnahme: X in Leseverstehen Teil 3 — das darf
   mehrfach vorkommen, wenn zu einer Situation keine Anzeige passt. */
function syncBank(sec){
  if (sec.format !== 'matching' && sec.format !== 'wordbank') return;
  const scope = document.getElementById('part-' + sec.id) || app;
  const used = new Map();
  sec.items.forEach(it => {
    const v = S.answers[it.id];
    if (v && v !== 'X') used.set(v, it.id);
  });
  scope.querySelectorAll('[data-keys]').forEach(box => {
    const id = box.dataset.keys;
    box.querySelectorAll('[data-key]').forEach(b => {
      const k = b.dataset.key.split('|')[1];
      b.disabled = !!k && used.has(k) && used.get(k) !== id;
    });
  });
}

function bindInputs(sec){
  const scope = document.getElementById('part-' + sec.id) || app;
  scope.querySelectorAll('[data-opt]').forEach(lb => {
    lb.onclick = () => {
      const [id, key] = lb.dataset.opt.split('|');
      const before = S.answers[id];
      if (before && before !== key){          // frühere Wahl durchstreichen
        (S.dropped[id] ||= []).push(before);
      }
      S.dropped[id] = (S.dropped[id] || []).filter(k => k !== key);
      S.answers[id] = key;
      dropStat(id);                          // Antwort geändert → neu bewerten
      markPart(sec.id);
      const box = lb.closest('.opts');
      box.querySelectorAll('.opt').forEach(x => {
        const k = x.dataset.opt.split('|')[1];
        x.classList.toggle('sel', k === key);
        x.classList.toggle('dropped', (S.dropped[id] || []).includes(k));
      });
      updateProgress();
    };
  });
  scope.querySelectorAll('[data-key]').forEach(b => b.onclick = () => {
    const [id, key] = b.dataset.key.split('|');
    if (key) S.answers[id] = key; else delete S.answers[id];
    dropStat(id);
    markPart(sec.id);
    // نعيد رسم المجموعة: التحديد بيتغيّر وزرّ المسح بيظهر أو بيختفي
    const q  = b.closest('.q');
    const it = sec.items.find(x => x.id === id);
    q.outerHTML = renderItem(sec, it);
    bindInputs(sec);
    syncBank(sec);
    updateProgress();
  });
  syncBank(sec);
  scope.querySelectorAll('[data-txt]').forEach(ta => {
    ta.oninput = () => {
      const id = ta.dataset.txt;
      S.answers[id] = ta.value;
      dropStat(id);
      markPart(sec.id);
      redrawChecks(sec, id);
      updateProgress();
    };
  });

  /* شطب نقطة من الليتبونكته */
  scope.querySelectorAll('[data-pt]').forEach(cb => {
    cb.onchange = () => {
      const [id, i] = cb.dataset.pt.split('|');
      S.checks[id] = S.checks[id] || [];
      S.checks[id][Number(i)] = cb.checked;
    };
  });
}

/* بنعيد رسم صندوق الفحوص بس — مو الحقل، وإلا بيضيع مكان المؤشّر */
function redrawChecks(sec, id){
  const box = document.getElementById('chk_' + id);
  const it  = sec.items.find(x => x.id === id);
  if (!box || !it) return;
  box.innerHTML = writingAside(it, S.answers[id] || '');
  box.querySelectorAll('[data-pt]').forEach(cb => {
    cb.onchange = () => {
      const [iid, i] = cb.dataset.pt.split('|');
      S.checks[iid] = S.checks[iid] || [];
      S.checks[iid][Number(i)] = cb.checked;
    };
  });
}

const answered = it => {
  const v = S.answers[it.id];
  return v !== undefined && String(v).trim() !== '';
};

function updateProgress(){
  if (S.view === 'praxis'){ praxisSave(); praxisSyncButtons(); praxisSyncTab(); return; }
  saveSession(S.run);
  const items = runItems(S.run);
  const done  = items.filter(answered).length;
  const p = document.getElementById('prog');
  // «١٢ من ٤٠» أوضح من «12 / 40» لواحد مو متعوّد على الاختصارات
  if (p) p.textContent = t('progress', { done, total: items.length });
  const f = document.getElementById('progfill');
  if (f) f.style.width = items.length ? (done / items.length * 100) + '%' : '0';
}

/* Pause: der Timer hält an und die Aufgaben werden verdeckt — wie eine
   echte Pause. Der Stand ist gesichert, die App darf auch zugehen. */
function pauseExam(run){
  stopTimer();
  saveSession(run);
  document.body.classList.add('paused');     // Aufgaben verdecken
  const box = document.createElement('div');
  box.className = 'modalback';
  box.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <h2 style="margin:0 0 6px">${esc(t('pause'))}</h2>
    <p>${esc(t('timerPaused'))}</p>
    <p class="pausetime">${mmss(S.left)} übrig</p>
    <div class="modalbtns">
      <button class="btn grey" data-exit>${esc(t('finish'))}</button>
      <button class="btn" data-go>${esc(t('resume'))}</button>
    </div></div>`;
  document.body.appendChild(box);
  const close = () => { box.remove(); document.body.classList.remove('paused'); };
  box.querySelector('[data-go]').onclick = () => {
    close();
    startTimer(S.left, () => { toast(t('timeUp')); finish(run, true); });
  };
  box.querySelector('[data-exit]').onclick = () => { close(); screenModell(S.modell); };
}

/* ============ Fehlerliste ============ */
/* Die Fehler stehen jetzt in der Datenbank: submit_attempt trägt sie ein,
   submit_drill nimmt sie wieder heraus, sobald die Aufgabe sitzt. Die App
   holt sie nur noch ab. */

/* Baut aus den Fehlern einen Übungsdurchgang: je Modelltest und Teil ein
   Abschnitt mit seinem Text und seiner Wortliste — sonst wären die Aufgaben
   gar nicht lösbar — aber nur mit den Aufgaben, die falsch waren. */
async function drillRun(){
  let rows;
  try { rows = await API.mistakes(); } catch { return null; }
  if (!rows || !rows.length) return null;

  // nach Modelltest und Abschnitt gruppieren
  const bySec = new Map();
  rows.forEach(row => {
    const it  = row.items;         if (!it) return;
    const sec = it.sections;       if (!sec || sec.format === 'writing') return;
    const key = `${sec.tests ? sec.tests.slug : '?'}~${sec.section_id}`;
    if (!bySec.has(key)) bySec.set(key, { sec, items: [] });
    bySec.get(key).items.push({
      id: it.id, num: it.item_id, text: it.text,
      ...(it.options ? { options: it.options } : {}),
      ...(it.meta || {})
    });
  });

  const parts = [];
  for (const [key, g] of bySec){
    const cfg = g.sec.config || {};
    parts.push({
      ...cfg, id: key, sid: g.sec.section_id, format: g.sec.format,
      title: `${g.sec.tests ? g.sec.tests.title : ''} · ${g.sec.title}`,
      instruction: '', items: g.items,
      pointsPerItem: 1, maxPoints: g.items.length,
      availablePoints: g.items.length
    });
  }
  if (!parts.length) return null;
  const n = parts.reduce((a, p) => a + p.items.length, 0);
  return { id: 'drill', title: t('drillTitle'), drill: true, parts,
           minutes: 0, maxPoints: n, availablePoints: n, missing: 0 };
}

/* ============ Korrektur ============ */

/* Notenstufen laut telc: 90 / 80 / 70 / 60 % der Höchstpunktzahl. */
function noteOf(pct){
  if (pct >= 90) return t('gradeVeryGood');
  if (pct >= 80) return t('gradeGood');
  if (pct >= 70) return t('gradeSatis');
  if (pct >= 60) return t('gradeSuffic');
  return t('gradeFail');
}

function saveResult(run, points, max, extra = {}){
  // points === null: Text abgegeben, aber noch nicht bewertet
  const pct = points === null ? null : Math.round(points / max * 100);
  const prog = load('b1.progress', {});
  // nur die letzte Prüfung je Prüfungsteil — eine neue ersetzt die alte
  (prog[S.modell.id] ||= {})[run.id] = {
    points, max, pct,
    date: new Date().toLocaleDateString('de-DE'),
    answers: { ...S.answers },
    ...extra
  };
  save('b1.progress', prog);
  return pct;
}

/* Der Text im Schriftlichen Ausdruck lebt sonst nur im Speicher — geht die
   Seite zu, ist eine halbe Stunde Arbeit weg. Darum wird beim Tippen laufend
   ein Entwurf gesichert und beim nächsten Start wieder eingesetzt. */

/* جلسة امتحان جارية: الإجابات والوقت المتبقّي. منحفظها باستمرار تا لو
   سكّرت الصفحة أو طلعت تتغدّى، ترجع من وين وقّفتي — والمؤقّت ما بيمشي وأنت
   برّا، لأنه بينحفظ الوقت المتبقّي مو وقت البداية. */
const sessKey = runId => `b1.session.${S.modell ? S.modell.id : '-'}.${runId}`;

function saveSession(run){
  if (!run || run.drill || S.view !== 'exam') return;
  save(sessKey(run.id), {
    answers: S.answers, dropped: S.dropped, left: S.left, plays: S.plays,
    date: new Date().toLocaleDateString('de-DE')
  });
}
const loadSession = runId => load(sessKey(runId), null);
function clearSession(runId){
  try { localStorage.removeItem(sessKey(runId)); } catch {}
}

function clearResult(modellId, runId){
  const prog = load('b1.progress', {});
  if (prog[modellId]) delete prog[modellId][runId];
  if (prog[modellId] && !Object.keys(prog[modellId]).length) delete prog[modellId];
  save('b1.progress', prog);
}

/* Die Lösungen kommen mit der Korrektur zurück. Sie werden hier auf die
   Aufgaben gelegt, damit die Ergebnisanzeige unverändert weiterläuft —
   vor dem Abgeben ist it.answer schlicht nicht vorhanden. */
function applyResults(run, results){
  const by = {};
  (results || []).forEach(r => { if (r.id) by[r.id] = r; });
  run.parts.forEach(p => p.items.forEach(it => {
    const r = by[it.id];
    if (!r) return;
    it.answer = r.answer;
    if (r.explanation) it.explain = r.explanation;
  }));
}

/* Korrigiert wird auf dem Server. Die App schickt die Antworten und
   bekommt Punkte und Lösungen zurück; sie kann nicht selbst rechnen. */
async function grade(run){
  app.innerHTML = `<div class="empty">${esc(t('aiWorking'))}</div>`;
  let res;
  try {
    res = run.drill
      ? await API.submitDrill(S.answers)
      : await API.submitAttempt(S.modell.uuid, run.id, S.answers);
  } catch {
    res = null;
  }
  if (!res || !res.ok){
    app.innerHTML = `<div class="empty">${esc(t('aiFailed'))}<br>${
      esc(t('savedOffline'))}</div>`;
    saveSession(run);
    return;
  }
  applyResults(run, res.results);
  refreshMistakes();

  // In manchen Modelltests fehlen Aufgaben (in der Vorlage abgeschnitten).
  // Der Server rechnet über die vorhandenen; hier wird auf die offizielle
  // Höchstpunktzahl hochgerechnet, damit alle Tests vergleichbar bleiben.
  if (run.drill && res.mastered)
    toast(`${plural(res.mastered, 'nSits')} ${t('nowDone')}`, 3500);
  const points = run.drill
    ? res.right
    : Math.round(res.points / (res.max_points || 1) * run.maxPoints * 10) / 10;
  const total  = runItems(run).length;
  const right  = (res.results || []).filter(r => r.correct).length;
  const pct    = run.drill ? Math.round(points / max * 100)
                           : saveResult(run, points, run.maxPoints,
                                        { results: res.results, attemptId: res.attempt_id });
  screenResult(run, points, run.drill ? max : run.maxPoints, pct, right, total);
}

function finish(run, auto){
  const go2 = () => {
    stopTimer();
    clearSession(run.id);
    if (run.parts.length === 1 && run.parts[0].format === 'writing'){
      // Der Text wird sofort gesichert. Die Abgabe wandert auch auf den
      // Server — ohne attempt_id gibt es keine KI-Korrektur.
      saveResult(run, null, run.parts[0].maxPoints);
      screenWriting(run);
      API.submitAttempt(S.modell.uuid, run.id, S.answers)
        .then(res => {
          if (!res || !res.ok) return;
          const prog = load('b1.progress', {});
          const rec = (prog[S.modell.id] || {})[run.id];
          if (rec){ rec.attemptId = res.attempt_id; save('b1.progress', prog); }
          const el = document.getElementById('aiwrap');
          if (el) renderAiBox(el, run, res.attempt_id, null);
        })
        .catch(() => {});
      return;
    }

    grade(run);
  };

  /* ★ السؤال عن الأسئلة الفاضية بيصير عند زرّ التسليم، مو هون.
     كان بالاتنين — فالطالب يلي بيسلّم ناقص كان يشوف نفس التحذير مرتين
     ورا بعض. وهاد كمان كان آخر نص ألماني مثبّت بالتطبيق.
     هون منسلّم على طول: مين وصل لهون خلص قرّر. */
  go2();
}

/* Antwort lesbar machen: "B — Bildband: Babys im Garten" */
function answerLabel(sec, it, k){
  if (!k) return t('noAnswer');
  if (sec.format === 'truefalse') return k === 'r' ? 'Richtig' : 'Falsch';
  // صح-خطأ جوّا قسم mc: «Richtig» أوضح من «r — Richtig»
  if ((k === 'r' || k === 'f') && (it.options || []).length === 2
      && it.options[0].key === 'r') return k === 'r' ? 'Richtig' : 'Falsch';
  if (sec.bank){
    const o = sec.bank.find(x => x.key === k);
    return o ? (o.text ? `${k} — ${o.text}` : k) : '—';
  }
  // خانة نصّ حرّ (Formular): القيمة نصّ، مو مفتاح خيار — نعرض النصّ نفسه
  // (أوّل بديل من «Köln|Koeln»).
  if (!(it.options && it.options.length)) return String(k).split('|')[0];
  const o = (it.options || []).find(x => x.key === k);
  return o ? `${k} — ${o.text}` : '—';
}

function scoreCard(points, max, pct, extra){
  const cls = pct >= 60 ? 'ok' : 'bad';
  return `<div class="card score">
    <div class="big" style="color:var(--${cls})">${fmtP(points)}<span style="font-size:26px;color:var(--muted)">/${fmtP(max)}</span></div>
    <div class="pct">${pct} % · ${esc(noteOf(pct))}</div>
    <div class="bar"><i class="${cls}" style="width:${pct}%"></i></div>
    <div class="meta" style="color:var(--muted);font-size:13px">
      ${esc(t('passFrom', { p: fmtP(max * 0.6) }))}${
        extra ? ' · ' + esc(extra) : ''}</div>
  </div>`;
}

/* ═══════════ Goethe-Prüfungssimulation ═══════════
   Ein zufälliger Modelltest aus dem Übungspool: Hören + Lesen + Schreiben,
   drei getrennt getaktete Phasen. Am Ende eine Auswertung — Hören und Lesen
   werden automatisch bewertet (submit_drill, Schlüssel bleibt am Server),
   Schreiben wird mit Musterlösung gezeigt, aber nicht benotet. */
const SIM_PLAN = [
  { key: 'Hören',     icon: '🎧', blocks: ['ht1', 'ht2', 'ht3'], min: 20 },
  { key: 'Lesen',     icon: '📖', blocks: ['lv1', 'lv2', 'lv3'], min: 25 },
  { key: 'Schreiben', icon: '✍️', blocks: ['s1', 's2'],          min: 20 },
];
const pickRand = a => a[Math.floor(Math.random() * a.length)];

function buildSim(m){
  const sec = id => m.sections.find(s => s.id === id);
  const fromBlock = bid => {
    const b = (m.blocks || []).find(x => x.id === bid);
    return (b && b.parts.length) ? sec(pickRand(b.parts)) : null;
  };
  return SIM_PLAN
    .map(ph => ({ key: ph.key, icon: ph.icon, min: ph.min,
                  secs: ph.blocks.map(fromBlock).filter(Boolean) }))
    .filter(ph => ph.secs.length);
}

function startSim(){
  const m = S.modell;
  if (!m) return toast(t('loadFailed'));
  const phases = buildSim(m);
  if (!phases.length) return toast(t('loadFailed'));
  S.answers = {}; S.dropped = {}; S.checks = {}; S.plays = {};
  S.sim = { phases, idx: 0 };
  simPhase(0);
}

function simPhase(i){
  const sim = S.sim; if (!sim) return;
  const ph = sim.phases[i]; sim.idx = i;
  const last = i === sim.phases.length - 1;
  // Zurück nur, solange die vorige Phase noch Restzeit hat (abgelaufene
  // Phasen bleiben zu — wie in der echten Prüfung).
  const canBack = i > 0 && (sim.phases[i - 1].left == null || sim.phases[i - 1].left > 0);
  S.run = { id: 'sim', sim: true, parts: ph.secs, title: ph.key, minutes: ph.min };
  go('exam', () => {
    const body = ph.secs.map(p => `
      <section class="part" id="part-${esc(p.id)}">
        <h2 class="parthead">${esc(p.title)}</h2>
        ${instrBlock(p.instruction || p.note)}
        ${renderPartBody(p)}
      </section>`).join('');
    app.innerHTML = `
      <div class="simhead">
        <span class="simstep">${esc(ph.icon)} ${esc(ph.key)}</span>
        <span class="simof">${esc(t('simStepOf', { n: i + 1, total: sim.phases.length }))}</span>
      </div>${body}
      <div class="bottombar"><div class="progbar"><i id="progfill"></i></div>
        <div class="inner simbar">
          <span class="progress" id="prog"></span>
          <div class="simacts">
            ${canBack ? `<button class="btn ghost" id="simprev">${esc(t('simPrev'))}</button>` : ''}
            <button class="btn ghost" id="simpause">⏸ ${esc(t('pause'))}</button>
            <button class="btn simgo" id="simnext">${esc(last ? t('simFinish') : t('simNext'))}</button>
          </div>
        </div></div>`;
    ph.secs.forEach(bindInputs);
    updateProgress();
    document.getElementById('simnext').onclick = () => {
      const msg = last ? t('simFinishAsk') : t('simNextAsk', { next: sim.phases[i + 1].key });
      ask(msg, () => simAdvance(i), last ? t('simFinish') : t('simNext'));
    };
    document.getElementById('simpause').onclick = () => simPause(i);
    const prev = document.getElementById('simprev');
    if (prev) prev.onclick = () => simBack(i);
    // ★ كل مرحلة بتحتفظ بوقتها: لمّا ترجع لمرحلة سابقة بتكمّل من وقتها
    //   يلي باقي، مو من الأول — فالرجوع للتعديل ما بيعطي وقت زيادة.
    startTimer(ph.left != null ? ph.left : ph.min * 60,
               () => { toast(t('timeUp')); simAdvance(i); });
  });
}

// ★ Pause: Uhr anhalten, Overlay zeigen, mit der Restzeit fortsetzen.
//   Auch den Hörtext anhalten (pauseAudio, nicht stopAudio) — in der Pause
//   darf keine Aufnahme weiterlaufen. „Fortsetzen" spielt genau da weiter,
//   wo angehalten wurde (resumeAudio), nicht von vorn.
function simPause(i){
  const leftNow = S.left;
  stopTimer();
  pauseAudio();
  const ov = document.createElement('div');
  ov.className = 'modalback';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
    <p><b style="font-size:1.3em">⏸</b><br>${esc(t('simPaused'))}</p>
    <div class="modalbtns"><button class="btn" data-resume>${esc(t('simResume'))}</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('[data-resume]').onclick = () => {
    ov.remove();
    startTimer(leftNow, () => { toast(t('timeUp')); simAdvance(i); });
    resumeAudio();   // الصوت بيكمّل من محلّ الوقفة
  };
}

function simAdvance(i){
  const sim = S.sim; if (!sim) return;
  sim.phases[i].left = S.left;            // Restzeit dieser Phase merken
  stopTimer();
  if (i < sim.phases.length - 1){ window.scrollTo(0, 0); simPhase(i + 1); }
  else simFinish();
}

// ★ Zurück zur vorherigen Phase, um Antworten zu bearbeiten. Antworten
//   bleiben erhalten (S.answers wird nie zwischendurch geleert), und jede
//   Phase läuft mit ihrer eigenen Restzeit weiter.
function simBack(i){
  const sim = S.sim; if (!sim || i <= 0) return;
  sim.phases[i].left = S.left;
  stopTimer();
  pauseAudio();
  window.scrollTo(0, 0);
  simPhase(i - 1);
}

async function simFinish(){
  stopTimer();
  app.innerHTML = `<div class="empty">${esc(t('aiWorking'))}</div>`;
  const allSecs = S.sim.phases.flatMap(ph => ph.secs);
  const ids = allSecs.flatMap(p => (p.items || []).map(it => it.id));
  // ★ Lösungen zum Vergleich holen (reveal_answers wie in der Übung) — der
  //   Schlüssel kommt erst nach der Abgabe und bleibt am Server geschützt.
  let res;
  try { res = await API.reveal(ids); } catch { res = null; }
  if (!res || !res.ok){ app.innerHTML = `<div class="empty">${esc(t('aiFailed'))}</div>`; return; }
  const by = {};
  (res.answers || []).forEach(a => { if (a.id) by[a.id] = a; });
  allSecs.forEach(p => (p.items || []).forEach(it => {
    const a = by[it.id];
    if (a){ it.answer = a.answer; if (a.explanation) it.explain = a.explanation; }
  }));
  simResult(by);
}

function simResult(byId){
  const sim = S.sim;
  const graded = it => !!byId[it.id];                       // Lösung vorhanden = bewertbar
  const isRight = it => {
    const a = byId[it.id]; if (!a) return false;
    // ★ خانة نصّ حرّ (Formular, Schreiben Teil 1): مطابقة مرنة متل التمرين
    //   (تجاهل حالة الأحرف والبدائل)؛ باقي الأسئلة: مطابقة المفتاح تماماً.
    return (it.options && it.options.length)
      ? S.answers[it.id] === a.answer
      : fillMatch(S.answers[it.id], a.answer);
  };
  const stats = sim.phases.map(ph => {
    let right = 0, total = 0;
    ph.secs.forEach(p => (p.items || []).forEach(it => {
      if (graded(it)){ total++; if (isRight(it)) right++; }
    }));
    return { key: ph.key, icon: ph.icon, right, total, secs: ph.secs };
  });
  const scored = stats.filter(s => s.total);               // Hören, Lesen, Schreiben-Teil-1
  const right = scored.reduce((a, s) => a + s.right, 0);
  const total = scored.reduce((a, s) => a + s.total, 0);
  const pct = total ? Math.round(right / total * 100) : 0;

  const skillLines = scored.map(s =>
    `<div class="partscore"><span class="grow">${esc(s.icon)} ${esc(s.key)}</span>
       <span class="pill ${s.right / s.total >= 0.6 ? 'ok' : 'bad'}">${s.right}/${s.total}</span></div>`).join('');

  // Auswertung: jede Fertigkeit und jeder Teil getrennt, mit allen Lösungen.
  const review = scored.map(s => {
    const secBlocks = s.secs.map(p => {
      const cards = (p.items || []).filter(graded).map(it => {
        const mine = S.answers[it.id], good = isRight(it);
        return `<div class="q ${good ? 'isok' : 'isbad'}">
          <div class="qhead"><span class="qnum">${esc(it.num || '')}</span>
            <span class="qtext grow">${esc(it.text)}</span></div>
          <div class="fb ${good ? 'ok' : 'bad'}">
            ${good ? `<b>✔ ${esc(t('correct'))}</b>`
                   : `<b>✘ ${esc(t('wrongShort'))}</b>
               <div class="fbrow"><span class="lbl">${esc(t('yourAnswer'))}</span><span class="val">${esc(answerLabel(p, it, mine))}</span></div>`}
            <div class="fbrow"><span class="lbl">${esc(t('solution'))}</span><span class="val">${esc(answerLabel(p, it, it.answer))}</span></div>
            ${it.explain ? `<div class="why">${esc(it.explain)}</div>` : ''}
          </div></div>`;
      }).join('');
      return cards ? `<h3 class="simrevhead">${esc(p.title)}</h3>${cards}` : '';
    }).join('');
    return `<div class="simrevskill"><div class="simrevtop">${esc(s.icon)} ${esc(s.key)}
      <span class="pill ${s.right / s.total >= 0.6 ? 'ok' : 'bad'}">${s.right}/${s.total}</span></div>${secBlocks}</div>`;
  }).join('');

  const wPhase = sim.phases.find(ph => ph.key === 'Schreiben');
  const wBlock = wPhase ? wPhase.secs.filter(p => p.format === 'writing').map(p => {
    const txt = (p.items && p.items[0]) ? (S.answers[p.items[0].id] || '').trim() : '';
    const mid = 'simmu-' + esc(p.id);
    return `<div class="card w2set" style="margin-top:14px">
      <div class="instr">${esc(p.title)}</div>
      ${txt ? `<div class="yourtext"><div class="lbl">${esc(t('yourText'))}</div><p>${esc(txt)}</p></div>`
            : `<p class="sub">${esc(t('noText'))}</p>`}
      ${p.muster ? `<button class="btn ghost" data-mu="${mid}">${esc(t('w2Muster'))}</button>
        <div class="muster" id="${mid}" hidden><h3>${esc(t('w2MusterTitle'))}</h3>
          <div class="body">${esc(p.muster)}</div></div>` : ''}
    </div>`;
  }).join('') : '';

  go('result', () => {
    app.innerHTML =
      scoreCard(right, total, pct, t('simRightOf', { right, total })) +
      (skillLines ? `<div class="card" style="margin-top:14px">${skillLines}</div>` : '') +
      `<h2 style="margin:18px 0 10px">${esc(t('simReview'))}</h2>${review}` +
      (wBlock ? `<h2 style="margin:18px 0 10px">✍️ Schreiben</h2>${wBlock}` : '') +
      `<div class="bottombar"><div class="inner">
        <button class="btn ghost" id="simagain">${esc(t('simAgain'))}</button>
        <button class="btn" id="simback">${esc(t('overview'))}</button>
      </div></div>`;
    app.querySelectorAll('[data-mu]').forEach(b => b.onclick = () => {
      const box = document.getElementById(b.dataset.mu);
      box.hidden = !box.hidden;
      b.textContent = box.hidden ? t('w2Muster') : t('w2MusterHide');
    });
    document.getElementById('simagain').onclick = () => startSim();
    document.getElementById('simback').onclick  = () => screenLevel();
  });
}

function screenResult(run, points, max, pct, right, total){
  go('result', () => {
    const perPart = run.parts.map(p => {
      const ok = p.items.filter(it => S.answers[it.id] === it.answer).length;
      // Nach der Abgabe darf das Transkript erscheinen: jetzt hilft es beim
      // Nachlesen, statt die Lösung zu verraten.
      const script = (p.audio && p.passages && p.passages.length)
        ? `<div class="passage"><h3>${esc(t('transcript'))}</h3>${p.passages.map(x =>
             (x.paragraphs || []).map(y =>
               `<p${y.b ? ' class="strong"' : ''}>${esc(y.t)}</p>`).join('')).join('')}</div>`
        : '';
      const pts = Math.round(ok * p.pointsPerItem / p.availablePoints * p.maxPoints * 10) / 10;
      const head = run.parts.length > 1
        ? `<div class="partscore"><span class="grow">${esc(p.title)}</span>
             <span class="meta">${ok}/${p.items.length} richtig</span>
             <span class="pill ${pts / p.maxPoints >= 0.6 ? 'ok' : 'bad'}">${fmtP(pts)}/${fmtP(p.maxPoints)} P.</span>
           </div>` : '';
      const cards = p.items.map(it => {
        const mine = S.answers[it.id];
        const good = mine === it.answer;
        return `<div class="q ${good ? 'isok' : 'isbad'}">
          <div class="qhead"><span class="qnum">${esc(it.num || it.id)}</span>
            <span class="qtext grow">${esc(it.text)}</span></div>
          <div class="fb ${good ? 'ok' : 'bad'}">
            ${good ? `<b>✔ Richtig · ${fmtP(p.pointsPerItem)} P.</b>` : `<b>${esc(t('wrong'))}</b>
               <div class="fbrow"><span class="lbl">${esc(t('yourAnswer'))}</span>
                 <span class="val">${esc(answerLabel(p, it, mine))}</span></div>
               <div class="fbrow"><span class="lbl">${esc(t('solution'))}</span>
                 <span class="val">${esc(answerLabel(p, it, it.answer))}</span></div>`}
            ${it.explain ? `<div class="why">${esc(it.explain)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      return head + script + cards;
    }).join('');

    /* ★ قسم كتابة جوّا بلوك فيه غيره.
       شاشة التصحيح الآلي كانت بتطلع بس لما البلوك كلّه قسم كتابة واحد
       — وهاد صحيح لـtelc B1 بس. بـÖSD وGoethe بلوك الكتابة قسمين
       (استمارة ورسالة)، وبـtelc B2 الكتابة جوّا بلوك القراءة والاستماع.
       يعني أربع مستويات من خمسة ما كان فيهن زرّ تصحيح أصلاً.

       بطاقة وحدة، مو زرّ لكل قسم: السيرفر بيصحّح قسم واحد بالبلوك،
       فلازم نعرض بالضبط هيداك — وإلا الطالب بيدفع من حصّته على استمارة. */
    const wPart = pickWriting(run.parts);
    const wText = wPart ? (S.answers[wPart.items[0].id] || '').trim() : '';
    const wWords = wText.split(/\s+/).filter(Boolean).length;

    app.innerHTML =
      scoreCard(points, max, pct, `${right} von ${total} Aufgaben richtig`) +
      (wPart ? `<div class="card" style="margin-top:16px">
        <h2>${esc(t('correction'))}</h2>
        <p class="sub" style="margin:0 0 10px">${esc(
          wWords >= AI_MIN_WORDS ? t('aiIntro') : t('aiErrShort'))}</p>
        ${wWords >= AI_MIN_WORDS ? `<button class="btn" id="wpart">${
          esc(wPart.title || t('correction'))}</button>` : ''}
      </div>` : '') +
      `<h2 style="margin:18px 0 10px">${esc(t('correction'))}</h2>${perPart}
      <div class="bottombar"><div class="inner">
        <button class="btn ghost" id="again">${esc(t('again'))}</button>
        <button class="btn" id="back">${esc(t('overview'))}</button>
      </div></div>`;

    // نفس الشاشة، بس على قسم الكتابة — ومعرّف الجولة بيضل هو معرّف
    // البلوك، لأنّ المحاولة بالقاعدة محفوظة بالبلوك
    const wBtn = document.getElementById('wpart');
    if (wBtn) wBtn.onclick = () => {
      const rec = (load('b1.progress', {})[S.modell.id] || {})[run.id] || {};
      screenWriting({ ...run, parts: [wPart],
                      sub: () => screenResult(run, points, max, pct, right, total) },
                    { attemptId: rec.attemptId });
    };

    document.getElementById('again').onclick = () =>
      run.drill ? drillRun().then(r => r ? screenIntro(r) : screenLevel())
                : screenIntro(run);
    document.getElementById('back').onclick  = () =>
      run.drill ? screenLevel() : screenModell(S.modell);
  });
}

/* Schriftlicher Ausdruck: Selbstbewertung nach den drei telc Kriterien.
   Jedes Kriterium A=5 / B=3 / C=1 / D=0, die Summe wird mit 3 multipliziert. */
function screenWriting(run, saved){
  const sec = run.parts[0];
  /* ★ التقييم الذاتي هو تمرين telc: تلات معايير بحروف. غير telc ما
     بيعطي معايير بالمحتوى، فالصندوق بينشال — بس التصحيح الآلي بيضل.
     بلا هالسطر: sec.criteria.map على undefined، والشاشة بتنهار. */
  const crits = sec.criteria || [];
  const it = sec.items[0];
  const mine = (S.answers[it.id] || '').trim();
  const words = mine.split(/\s+/).filter(Boolean).length;
  const grades = { ...(saved && saved.grades || {}) };
  // ★ مو كل قسم كتابة إله حدّ أدنى. كان مكتوب `it.minWords || 100`،
  //   يعني طالب A1 يشوف «اكتب ١٠٠ كلمة على الأقل» ببريد من تلات جمل.
  const minW = it.minWords || 0;

  go('result', () => {
    app.innerHTML = `
      <div class="card">
        <h2>${esc(t('yourText'))}</h2>
        <p class="sub">${esc(plural(words, 'words'))}${
          minW && words < minW ? ' ' + esc(t('minWords', { n: minW })) : ''}</p>
        <div class="passage" style="margin:0"><div class="body">${esc(mine || '(kein Text geschrieben)')}</div></div>
      </div>
      <div class="card">
        <h2>${esc(t('taskHead'))}</h2>
        ${renderBrief(sec)}
      </div>
      ${crits.length ? `<div class="card">
        <h2>${esc(t('grading'))}</h2>
        <p class="sub">${esc(t('rateSelf'))}</p>
        ${crits.map((c, i) => `
          <div class="crit">
            <h3>${esc(c.title)}</h3>
            <p class="sub" style="margin:0 0 8px">${esc(c.hint)}</p>
            <div class="opts inline">${(sec.grades || []).map(g =>
              `<label class="opt" data-crit="${i}|${esc(g.key)}">
                 <input type="radio" name="crit${i}" value="${esc(g.key)}">
                 <span class="k">${esc(g.key)}</span>
                 <span class="grow">${g.points} P.</span>
               </label>`).join('')}</div>
          </div>`).join('')}
        <div id="wres"></div>
      </div>` : ''}
      <div class="card" id="aiwrap">
        <h2>${esc(t('correction'))}</h2>
        <p class="sub" style="margin:0">${esc(t('preparing'))}</p>
      </div>
      <div class="bottombar"><div class="inner">${run.sub
        ? `<button class="btn" id="back">${esc(t('back'))}</button>`
        : `<button class="btn ghost" id="again">${esc(t('again'))}</button>
           <button class="btn" id="back">${esc(t('overview'))}</button>`}
      </div></div>`;

    app.querySelectorAll('[data-crit]').forEach(lb => {
      lb.onclick = () => {
        const [i, key] = lb.dataset.crit.split('|');
        grades[i] = (sec.grades || []).find(g => g.key === key).points;
        lb.closest('.opts').querySelectorAll('.opt').forEach(x => x.classList.remove('sel'));
        lb.classList.add('sel');
        if (Object.keys(grades).length < crits.length) return;

        const points = Object.values(grades).reduce((a, b) => a + b, 0) * sec.factor;
        /* ★ بالشاشة الفرعية معرّف الجولة هو معرّف البلوك كلّه. لو حفظنا،
           تقييم الرسالة بيمحي نتيجة البلوك (القراءة والاستماع معها). */
        const pct = run.sub ? Math.round(points / sec.maxPoints * 100)
                            : saveResult(run, points, sec.maxPoints, { grades: { ...grades } });
        const box = document.getElementById('wres');
        if (box) box.innerHTML = scoreCard(points, sec.maxPoints, pct, '');
      };
    });
    if (saved){                              // gespeicherte Bewertung wiederherstellen
      Object.entries(grades).forEach(([i, pts]) => {
        const g = (sec.grades || []).find(x => x.points === pts);
        const lb = g && app.querySelector(`[data-crit="${i}|${g.key}"]`);
        if (lb){ lb.classList.add('sel'); lb.querySelector('input').checked = true; }
      });
      // بلا معايير ما في صندوق نتيجة — وقتها ما في وين ننزّل العلامة
      const box = document.getElementById('wres');
      if (box && saved.points !== null && saved.points !== undefined)
        box.innerHTML = scoreCard(saved.points, sec.maxPoints, saved.pct, '');
    }
    const againBtn = document.getElementById('again');
    if (againBtn) againBtn.onclick = () => screenIntro(run);
    document.getElementById('back').onclick  = () =>
      run.sub ? run.sub() : screenModell(S.modell);

    const box = document.getElementById('aiwrap');
    if (box) renderAiBox(box, run, saved && saved.attemptId, mine);
  });
}

/* ============ KI-Korrektur des Briefs ============
   Die Selbstbewertung oben bleibt: sie ist die Übung, die telc verlangt.
   Die Korrektur kommt daneben — sie sagt, was tatsächlich im Text steht. */
function renderAiBox(box, run, attemptId, text){
  if (!attemptId){
    box.innerHTML = `<h2>${esc(t('correction'))}</h2>
      <p class="sub" style="margin:0">${esc(t('aiOffline'))}</p>`;
    return;
  }
  box.innerHTML = `<h2>${esc(t('correction'))}</h2>
    <p class="sub" style="margin:0 0 10px">${esc(t('aiIntro'))}</p>
    <button class="btn" id="aigo">${esc(t('aiRequest'))}</button>
    <div id="aiout"></div>`;

  const out = document.getElementById('aiout');
  const btn = document.getElementById('aigo');

  // schon einmal korrigiert? dann nicht noch einmal bezahlen
  API.writingFeedback(attemptId).then(fb => { if (fb) showAi(out, btn, fb); })
    .catch(() => {});

  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = t('correcting');
    let r;
    try { r = await API.correctWriting(attemptId); }
    catch { r = { ok: false, error: 'network' }; }
    btn.disabled = false; btn.textContent = t('requestCorrection');
    if (r && r.ok) return showAi(out, btn, r);
    out.innerHTML = `<p class="sub" style="color:var(--bad)">${esc(t({
      quota_exceeded: 'aiErrQuota',
      not_entitled:   'aiErrNoSub',
      empty_text:     'aiErrEmpty',
      too_short:      'aiErrShort',
      not_configured: 'aiErrSetup',
      bad_model:      'aiErrSetup',   // إعداد غلط عند الأدمن، مو غلط الطالب
      refused:        'aiErrRefused',
      ai_quota:       'aiErrDaily',   // حصّة النموذج اليومية، مو حصّة الطالب
      network:        'aiErrNetwork'
    }[r && r.error] || 'aiErrOther'))}</p>`;
  };
}

function showAi(out, btn, fb){
  if (btn) btn.hidden = true;
  const GRADE_PTS = g => (g && g.points != null) ? g.points : '';
  out.innerHTML = `
    ${fb.points != null ? scoreCard(fb.points, fb.max_points,
        Math.round(fb.points / fb.max_points * 100), 'KI-Korrektur') : ''}
    ${(fb.grades || []).map(g => `<div class="crit">
      <h3>${esc(g.criterion)} <span class="pill">${esc(g.key)}</span></h3>
      <p class="sub" style="margin:0">${esc(g.why)}</p>
    </div>`).join('')}
    ${fb.summary ? `<div class="why" style="margin:12px 0">${esc(fb.summary)}</div>` : ''}
    ${(fb.errors || []).length ? `<h3 style="margin:14px 0 6px">${esc(t('errorDetail'))}</h3>
      ${fb.errors.map(e => `<div class="q isbad">
        <div class="qhead"><span class="qnum">${esc(e.type)}</span></div>
        <div class="fb bad">
          <div class="fbrow"><span class="lbl">Ihr Text</span>
            <span class="val">${esc(e.original)}</span></div>
          <div class="fbrow"><span class="lbl">${esc(t('better'))}</span>
            <span class="val">${esc(e.correction)}</span></div>
          ${e.why ? `<div class="why">${esc(e.why)}</div>` : ''}
        </div></div>`).join('')}` : ''}
    ${fb.corrected ? `<details style="margin-top:12px">
       <summary class="sub">${esc(t('aiView'))}</summary>
       <div class="passage" style="margin:8px 0 0"><div class="body">${esc(fb.corrected)}</div></div>
     </details>` : ''}`;
}

// beim Schließen/Wegwischen den Stand sichern
addEventListener('pagehide', () => { if (S.view === 'praxis') praxisSave(); else saveSession(S.run); });
addEventListener('visibilitychange', () => { if (document.hidden){ if (S.view === 'praxis') praxisSave(); else saveSession(S.run); } });

boot();
