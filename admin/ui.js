/* طبقة عرض مشتركة للوحة التحكّم — أساس إعادة الهيكلة.
   بتشتغل بـglobal واحد `UI` متل باقي ملفّات اللوحة (بلا bundler ولا مكتبات):

   · UI.modal(…)     نافذة واحدة موحّدة: focus-trap + Escape + نقرة الخلفية
                     + إرجاع الفوكس + منع تمرير الخلفية + aria. بتستبدل
                     النوافذ الخام يلي كانت كل وحدة متطبّقة لحالها.
   · UI.delegate(…)  تفويض حدث: مستمع واحد على الحاوية بدل ربط كل زرّ بعد
                     كل رسم — بيضل شغّال حتى لو تغيّر محتوى الحاوية.

   كل شي هون نقي (بلا نداء شبكة)، فبينفتح على require بالاختبار كمان. */
'use strict';

const UI = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* تفويض حدث: نربط مستمع واحد على `root`، وكل حدث منقّيه بالـselector.
     الفائدة: ما منعيد ربط كل زرّ بعد كل innerHTML، والأزرار المضافة
     لاحقاً بتشتغل بلا ربط جديد. منرجّع دالة لإلغاء الربط لو احتجناها. */
  function delegate(root, type, selector, handler){
    const fn = e => {
      const el = e.target.closest(selector);
      if (el && root.contains(el)) handler(el, e);
    };
    root.addEventListener(type, fn);
    return () => root.removeEventListener(type, fn);
  }

  let openCount = 0;

  /* نافذة حوار موحّدة.
     opts: { title، html، wide، onClose }. منرجّع { root، panel، body، close }.
     body = مكان المحتوى، تقدري تربطي عليه أحداثك (أو تستعملي UI.delegate). */
  function modal({ title = '', html = '', wide = false, onClose } = {}){
    const prevFocus = document.activeElement;
    const back = document.createElement('div');
    back.className = 'uimodal-back';
    back.innerHTML =
      `<div class="uimodal${wide ? ' wide' : ''}" role="dialog" aria-modal="true"
            aria-label="${esc(title)}" tabindex="-1">
        ${title ? `<div class="uimodal-hd">
          <h2>${esc(title)}</h2>
          <button class="uimodal-x" type="button" aria-label="Schließen" data-uiclose>✕</button>
        </div>` : ''}
        <div class="uimodal-bd">${html}</div>
      </div>`;
    const panel = back.querySelector('.uimodal');
    const bodyEl = back.querySelector('.uimodal-bd');

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      back.remove();
      if (--openCount <= 0){ openCount = 0; document.body.style.overflow = ''; }
      if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch {} }
      onClose && onClose();
    };

    const focusables = () => [...panel.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),' +
      'select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      .filter(el => el.offsetParent !== null || el === document.activeElement);

    function onKey(e){
      if (e.key === 'Escape'){ e.stopPropagation(); e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length){ e.preventDefault(); panel.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }

    back.addEventListener('mousedown', e => { if (e.target === back) close(); });
    delegate(back, 'click', '[data-uiclose]', () => close());
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(back);
    openCount++;
    document.body.style.overflow = 'hidden';
    const f = focusables();
    (f[0] || panel).focus();

    return { root: back, panel, body: bodyEl, close };
  }

  return { esc, delegate, modal };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = UI;
