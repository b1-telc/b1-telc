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

} catch (e){
  console.log('  ✗ استثناء:', e.message);
  fail++;
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${fail ? '✗' : '✓'} ${pass}/${pass + fail} فحص نجح`);
process.exit(fail ? 1 : 0);
