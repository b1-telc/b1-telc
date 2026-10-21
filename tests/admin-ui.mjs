/* اختبار واجهة اللوحة بلا قاعدة بيانات.
   سيرفر وهمي بيردّ JSON جاهز وبيعدّ النداءات، وplaywright بيشغّل اللوحة
   الحقيقية فوقه. الهدف: التأكّد من سلوك الواجهة بعد إعادة الهيكلة —
   التحديث الجزئي (بلا إعادة جلب القائمة) والنافذة الموحّدة (Escape/فوكس).

   مكمّل لـtests/admin.mjs (يلي بيختبر الدوال على Postgres حقيقي)، مو بديل. */
import pw from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import { readFileSync } from 'fs';
import http from 'http';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const DAY  = 86400000;
const iso  = ms => new Date(ms).toISOString();

const calls = {};
let subEnd = Date.now() + 40 * DAY;         // اشتراك فعّال: ٤٠ يوم

const RPC = {
  schema_version: () => 32,
  admin_overview: () => ({ users:1, active_subs:1, expiring_7d:0, expired:0,
    codes_unused:5, attempts_7d:0, tests_published:1, reports_open:0, levels:[] }),
  admin_redeem_activity: () => null,
  admin_limits: () => ({ active:1, max_active:0, today:0, max_new_per_day:0, waiting:0 }),
  admin_waitlist: () => [],
  admin_users: () => ([{
    id:'uuuuuuuu-0000-0000-0000-000000000001', name:'Testnutzer', note:'', devices:1,
    attempts:3, best_pct:80, mistakes:0,
    last_seen_at:iso(Date.now()), created_at:iso(Date.now() - 10*DAY),
    codes:[{ code:'B1TEST', levels:['goethe-a1'], at:iso(Date.now() - 5*DAY) }],
    subs:[{ id:'ssssssss-0000-0000-0000-000000000001', levels:['goethe-a1'],
            status:'active', current_period_end:iso(subEnd), days_left:40, code:'B1TEST' }]
  }]),
  admin_shift_subscription: (a) => { subEnd += Number(a.p_days) * DAY;
    return { ok:true, current_period_end: iso(subEnd) }; },
  admin_content: () => ({
    levels:[
      { id:'goethe-a1', provider:'Goethe', stufe:'A1', title:'Goethe · A1',
        published:true, sort:0, tests:1 },
      { id:'telc-b1', provider:'telc', stufe:'B1', title:'telc · B1',
        published:true, sort:1, tests:1 },
    ],
    tests:[
      { id:'t1', level_id:'goethe-a1', slug:'modell-01', title:'Goethe Modell 01',
        sections:7, aufgaben:9, answers:8, published:true },
      { id:'t2', level_id:'telc-b1', slug:'telc-01', title:'telc Modell 01',
        sections:5, aufgaben:40, answers:40, published:true },
    ],
    resources:[{ id:'r1', level_id:'goethe-a1', title:'Wortschatz Reisen',
                 length:1200, published:true }],
    imports:[] }),
  admin_upsert_level:       () => ({ ok:true }),
  admin_set_test_published: () => ({ ok:true }),
  admin_delete_test:        () => ({ ok:true }),
  admin_delete_resource:    () => ({ ok:true }),
  admin_codes: () => ([
    { id:'c1', code:'B1FREI0001', levels:['goethe-a1'], uses:0, max_uses:2, duration_days:30,
      duration_hours:null, test_slugs:[], redeemers:[], note:'frei',
      created_at:iso(Date.now()-DAY), revoked_at:null },
    { id:'c2', code:'B1VOLL0002', levels:['goethe-a1'], uses:2, max_uses:2, duration_days:30,
      duration_hours:null, test_slugs:[], note:'voll',
      redeemers:[{ name:'A', at:iso(Date.now()) }, { name:'B', at:iso(Date.now()) }],
      created_at:iso(Date.now()-2*DAY), revoked_at:null },
  ]),
  admin_revoke_code:  () => ({ ok:true }),
  admin_add_code_use: () => ({ ok:true, max_uses:3 }),
};

let PORT = 0;
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (c, b) => { res.writeHead(c, { 'content-type':'application/json' });
    res.end(JSON.stringify(b)); };

  if (u.pathname === '/auth/v1/token')
    return send(200, { access_token:'ADMIN', refresh_token:'R',
      expires_at: Math.floor(Date.now()/1000) + 3600 });

  if (u.pathname.startsWith('/rest/v1/rpc/')){
    const fn = u.pathname.split('/').pop();
    let b = ''; for await (const c of req) b += c;
    const args = JSON.parse(b || '{}');
    calls[fn] = (calls[fn] || 0) + 1;
    return send(200, RPC[fn] ? RPC[fn](args) : null);
  }
  if (u.pathname.startsWith('/rest/v1/')) return send(200, []);  // جداول (Protokoll) فاضية

  let f = u.pathname === '/' ? '/admin/index.html' : u.pathname;
  if (f === '/assets/config.js'){
    res.writeHead(200, { 'content-type':'text/javascript' });
    return res.end(`window.TELC_CONFIG={supabaseUrl:'http://127.0.0.1:${PORT}',supabaseAnonKey:'anon'};`);
  }
  try {
    const body = readFileSync(path.join(ROOT, f));
    res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'text/plain' });
    res.end(body);
  } catch { res.writeHead(404); res.end('no'); }
});

await new Promise(r => server.listen(0, r));
PORT = server.address().port;

let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`  ${ok ? '✓' : '✗'} ${name}`); ok ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 3000){ const t0 = Date.now();
  while (Date.now() - t0 < ms){ if (await fn()) return true; await sleep(30); } return false; }

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('dialog', d => d.accept().catch(() => {}));   // confirm() → OK (للحذف)
page.on('console', m => { if (m.type() === 'error') console.log('  · console:', m.text()); });
page.on('pageerror', e => console.log('  · pageerror:', e.message));
await page.addInitScript(() => {
  try { localStorage.setItem('telc.admin.session', JSON.stringify({
    access_token:'ADMIN', refresh_token:'R',
    expires_at: Math.floor(Date.now()/1000) + 3600 })); } catch {}
});

try {
  await page.goto(`http://127.0.0.1:${PORT}/admin/index.html`, { waitUntil:'load' });

  // دخل مباشرة (جلسة مزروعة) وطلع التبويب
  await until(() => page.$('[data-tab="users"]'));
  await page.click('[data-tab="users"]');
  const seen = await until(async () =>
    (await page.textContent('#app'))?.includes('Testnutzer'));
  check('شاشة Nutzer بترسم المستخدم', seen);

  const usersBefore = calls.admin_users || 0;
  const cellBefore = (await page.textContent('[data-subcell]'))?.trim();
  check('خانة الاشتراك فيها «40 Tage»', /40\s*Tage/.test(cellBefore || ''));

  // +30: تحديث جزئي — بلا إعادة جلب القائمة
  await page.click('[data-shift="30"]');
  const shifted = await until(() => (calls.admin_shift_subscription || 0) === 1);
  check('admin_shift_subscription انندهت مرة', shifted);
  check('admin_users ما انعاد جلبها (تحديث جزئي)', (calls.admin_users || 0) === usersBefore);
  const cellAfter = await until(async () =>
    /70\s*Tage/.test((await page.textContent('[data-subcell]')) || ''));
  check('الخانة تحدّثت لـ«70 Tage» بلا إعادة رسم كامل', cellAfter);

  // النافذة الموحّدة: فتح، فوكس داخلها، Escape بيسكّر ويرجّع الفوكس
  await page.click('[data-more]');
  const modalOpen = await until(() => page.$('.uimodal-back'));
  check('نافذة التفاصيل فتحت (UI.modal)', !!modalOpen);
  const focusInside = await page.evaluate(() =>
    !!document.querySelector('.uimodal')?.contains(document.activeElement));
  check('الفوكس انحبس داخل النافذة', focusInside);

  const usersBeforeClose = calls.admin_users || 0;
  await page.keyboard.press('Escape');
  const closed = await until(async () => !(await page.$('.uimodal-back')));
  check('Escape بيسكّر النافذة', closed);
  const refetched = await until(() => (calls.admin_users || 0) === usersBeforeClose + 1);
  check('بعد الإغلاق انعادت القائمة مرة وحدة (onClose)', refetched);
  const focusBack = await page.evaluate(() =>
    document.activeElement?.getAttribute('data-more') != null ||
    document.activeElement === document.body);
  check('الفوكس رجع برّا النافذة', focusBack);

  // ── Codes: sperren / +1 تحديث جزئي بلا إعادة جلب القائمة ──
  await page.click('[data-tab="codes"]');
  await until(() => page.$('[data-codes]'));
  const codesCalls = calls.admin_codes || 0;

  await page.click('[data-coderow="c1"] [data-rev]');
  const revoked = await until(async () =>
    /gesperrt/.test((await page.textContent('[data-coderow="c1"]')) || ''));
  check('sperren: صفّ الكود صار «gesperrt»', revoked);
  check('sperren: admin_codes ما انعاد جلبها', (calls.admin_codes || 0) === codesCalls);

  await page.click('[data-coderow="c2"] [data-more1]');
  const bumped = await until(async () =>
    /2\s*\/\s*3/.test((await page.textContent('[data-coderow="c2"]')) || ''));
  check('+1: خانة التفعيلات صارت «2 / 3»', bumped);
  check('+1: زرّ +1 اختفى', !(await page.$('[data-coderow="c2"] [data-more1]')));
  check('+1: admin_codes ما انعاد جلبها', (calls.admin_codes || 0) === codesCalls);

  // ── Inhalte: تبديل نشر + حذف جزئي بلا إعادة جلب الكتالوج ──
  await page.click('[data-tab="content"]');
  await until(() => page.$('[data-levels]'));
  const contentCalls = calls.admin_content || 0;

  // فلتر الامتحانات: يعيد الرسم client-side بلا إعادة جلب الكتالوج
  check('Inhalte: الجدول يبدأ بامتحانين', (await page.locator('[data-testrow]').count()) === 2);
  await page.selectOption('#t_lvl', 'goethe-a1');
  check('Inhalte: الفلتر عرض امتحان واحد', await until(async () =>
    (await page.locator('[data-testrow]').count()) === 1));
  check('Inhalte: الفلتر ما أعاد جلب الكتالوج', (calls.admin_content || 0) === contentCalls);
  await page.selectOption('#t_lvl', '');   // رجوع لـ«alle» لباقي الفحوص

  await page.click('[data-lvlrow="goethe-a1"] [data-lvl]');
  check('Inhalte: نشر الستوفة → «versteckt»', await until(async () =>
    /versteckt/.test((await page.textContent('[data-lvlrow="goethe-a1"]')) || '')));

  await page.click('[data-testrow="t1"] [data-tpub]');
  check('Inhalte: نشر الامتحان → «Entwurf»', await until(async () =>
    /Entwurf/.test((await page.textContent('[data-testrow="t1"]')) || '')));

  await page.click('[data-testrow="t1"] [data-tdel]');
  check('Inhalte: حذف الامتحان → الصفّ انشال', await until(async () =>
    !(await page.$('[data-testrow="t1"]'))));

  await page.click('[data-resrow="r1"] [data-rdel]');
  check('Inhalte: حذف المادة → الصفّ انشال', await until(async () =>
    !(await page.$('[data-resrow="r1"]'))));

  check('Inhalte: admin_content ما انعاد جلبها بعد الإجراءات',
    (calls.admin_content || 0) === contentCalls);

  // ── روابط سير العمل بين Inhalte ↔ Import ──
  await page.click('#t_import');
  check('رابط «+ Neuen Test importieren» فتح Import', await until(() => page.$('#i_slug')));
  await page.click('#i_toinhalt');
  check('رابط «← Modelltests» رجّع لـInhalte', await until(() => page.$('#t_import')));

} catch (e){
  console.log('  ✗ استثناء:', e.message);
  fail++;
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${fail ? '✗' : '✓'} ${pass}/${pass + fail} فحص نجح`);
process.exit(fail ? 1 : 0);
