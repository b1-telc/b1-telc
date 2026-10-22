/* تشغيل حقيقي لدالة البوت بـDeno.
   تلغرام مزيّف (منسجّل شو انبعت) وSupabase مزيّف (بيترجم لـpsql على
   القاعدة المحلية) — بس **الدالة نفسها** هي كود الإنتاج بالحرف. */
const PORT_SUPA = 54331;
const PORT_TG   = 54332;

const psql = (q: string) => {
  const p = new Deno.Command("psql", {
    args: ["-h","/tmp","-p","5433","-U","postgres","-d","telc","-tAq","-v","ON_ERROR_STOP=1","-c", q],
    stdout: "piped", stderr: "piped",
  }).outputSync();
  const out = new TextDecoder().decode(p.stdout).trim();
  if (p.code !== 0) throw new Error(new TextDecoder().decode(p.stderr));
  return out.split("\n").map(l => l.trim()).filter(Boolean).pop() ?? "";
};

const lit = (v: unknown): string =>
  v === null || v === undefined ? "null"
  : typeof v === "number" || typeof v === "boolean" ? String(v)
  : `'${String(v).replaceAll("'", "''")}'`;

/* ---- Supabase مزيّف: service_role بس، متل الإنتاج ---- */
const supa = Deno.serve({ port: PORT_SUPA, onListen() {} }, async (req) => {
  const fn = new URL(req.url).pathname.split("/").pop()!;
  const args = await req.json();
  const named = Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(", ");
  try {
    return new Response(
      psql(`select coalesce(to_jsonb(${fn}(${named})),'null'::jsonb);`),
      { headers: { "content-type": "application/json" } });
  } catch (e) {
    const m = String(e).split("\n").find(l => l.includes("ERROR")) ?? String(e);
    return new Response(JSON.stringify({ message: m.slice(0, 200) }), { status: 400 });
  }
});

/* ---- تلغرام مزيّف ---- */
type Sent = { method: string; body: any };
const sent: Sent[] = [];
// ★ بيرجّع message_id متل تلغرام الحقيقي: الدالة بتحفظه لتعرف وين
//   البطاقة، وبلاه التنبيه ما بيلاقي شو يعدّل
let mid = 1000;
let botName = "TestPruefungBot";
const tgSrv = Deno.serve({ port: PORT_TG, onListen() {} }, async (req) => {
  const method = new URL(req.url).pathname.split("/").pop()!;
  const body = await req.json().catch(() => ({}));
  sent.push({ method, body });
  const result = method === "sendMessage"
    ? { message_id: ++mid, chat: { id: body?.chat_id } }
    : method === "getMe" ? { username: botName } : {};
  return new Response(JSON.stringify({ ok: true, result }),
                      { headers: { "content-type": "application/json" } });
});

Deno.env.set("SUPABASE_URL", `http://127.0.0.1:${PORT_SUPA}`);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_KEY");
Deno.env.set("TELEGRAM_BOT_TOKEN", "T0KEN");
Deno.env.set("TELEGRAM_WEBHOOK_SECRET", "s3cret");
Deno.env.set("APP_URL", "https://b1-telc.example.dev");
Deno.env.set("ADMIN_CHAT_ID", "-1004242");   // مجموعة، مو شخص

/* نداءات api.telegram.org بتتحوّل للسيرفر المزيّف */
const realFetch = globalThis.fetch;
globalThis.fetch = ((u: any, o?: any) => {
  const s = String(u);
  if (s.startsWith("https://api.telegram.org/"))
    return realFetch(s.replace("https://api.telegram.org", `http://127.0.0.1:${PORT_TG}`), o);
  return realFetch(u, o);
}) as any;

const R: [string, boolean][] = [];
const check = (l: string, c: unknown) => { R.push([l, !!c]); console.log(`  ${c ? "✓" : "✗"} ${l}`); };

let handler!: (r: Request) => Promise<Response> | Response;
const realServe = Deno.serve;
// @ts-ignore: منلقط المعالج بدل ما نشغّل سيرفر
Deno.serve = ((h: any) => { handler = h; return { finished: Promise.resolve(), shutdown(){}, addr:{} } as any; }) as any;
await import("../../supabase/functions/telegram/index.ts");
Deno.serve = realServe;

console.log("\n=== Edge Function: بوت تلغرام ===");

/* حالة معروفة: b1 لحاله.
   ★ عدد المؤسسات بيغيّر أول خطوة بالبوت (مؤسسة وحدة = قفزة للدرجات)،
   والمراحل يلي قبلنا بتخلّف مستويات — اختبارات SQL، وimport.mjs.
   فمنبلّش من حالة منعرفها، متل ما بيعمل admin.mjs بعدنا بالضبط. */
psql(`delete from telegram_users;
      delete from writing_feedback; delete from mistakes;
      delete from attempts; delete from imports; delete from resources;
      delete from tests  where level_id <> 'b1';
      delete from levels where id       <> 'b1';
      delete from code_redemptions; delete from devices;
      delete from subscriptions; delete from access_codes;`);

const post = (update: unknown, secret: string | null = "s3cret") =>
  handler(new Request("http://x/telegram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
    },
    body: JSON.stringify(update),
  }));

const last = (m = "sendMessage") => [...sent].reverse().find(s => s.method === m)?.body;
/* ★ «آخر شاشة» بعد ما صار التنقّل يعدّل رسالة وحدة: التعديل والإرسال
   الاتنين بيغيّروا اللي قدّام الطالب، فالفحص لازم يشوفهن سوا. */
const screenNow = () => [...sent].reverse().find(x =>
  x.method === "sendMessage" || x.method === "editMessageText")?.body;
/* ★ صار في شاتين: الطالب وقناتك. «آخر رسالة» لحالها صارت ملتبسة —
   إشعارك بيوصل بعد رسالة الطالب فبيسرق last(). منسأل عن شات بعينه. */
const toChat = (id: number) =>
  [...sent].reverse().find(x => x.method === "sendMessage" && x.body?.chat_id === id)?.body;
const kb = () => screenNow()?.reply_markup?.inline_keyboard ?? [];
const lastOf = (m: string) => [...sent].reverse().find(x => x.method === m)?.body;
/* اللوحة الثابتة: reply_markup.keyboard مو inline_keyboard */
/* ★ رسالة الكود هي يلي عليها زرّ النسخ — مو «آخر رسالة»، لأنّ بعدها
   بتجي خطوة «كيف تستعمله» وهي يلي بتحمل اللوحة الثابتة. */
const codeMsg = () => [...sent].reverse().find(x =>
  (x.method === "sendMessage" || x.method === "editMessageText")
  && (x.body?.reply_markup?.inline_keyboard ?? []).flat()
       .some((b: any) => b.copy_text))?.body;
const perm = (id: number) =>
  (toChat(id)?.reply_markup?.keyboard ?? []).flat().map((b: any) => b.text);
const flat = () => kb().flat();

const TG_ID = 987654321;
const msg = (text: string, lc = "ar") => ({
  message: { chat: { id: TG_ID }, from: { id: TG_ID, username: "kiko", language_code: lc }, text },
});
/* ★ الضغطة الحقيقية بتجي ومعها الرسالة يلي عليها الزرّ: رقمها ووقتها.
   كانت ناقصة هون — فالدالة ما كان عندها شي تعدّله وكانت تبعت رسالة
   جديدة دايماً، يعني مسار التعديل كله ما كان ينفحص أصلاً.
   وnow-ageSec بيسمح نجرّب زرّ قديم بلا ما ننطر. */
let clickMid = 500;
const click = (data: string, lc = "ar", ageSec = 0) => ({
  callback_query: { id: "cb1", data,
    from: { id: TG_ID, username: "kiko", language_code: lc },
    message: { chat: { id: TG_ID }, message_id: ++clickMid,
               date: Math.floor(Date.now() / 1000) - ageSec } },
});
/* نفس الزرّ على نفس الرسالة — تا نتابع إنّها هي يلي عم تتعدّل */
const clickSame = (data: string, m: number, ageSec = 0) => ({
  callback_query: { id: "cb1", data,
    from: { id: TG_ID, username: "kiko", language_code: "ar" },
    message: { chat: { id: TG_ID }, message_id: m,
               date: Math.floor(Date.now() / 1000) - ageSec } },
});

/* شو بيشوف الطالب فعلاً: آخر رسالة انبعتتله أو انتعدّلت عنده.
   بعد ما صار التنقّل بيعدّل رسالة وحدة، «آخر sendMessage» ما عادت
   تعني «آخر شاشة». */
const shown = (id: number) => [...sent].reverse().find(x =>
  (x.method === "sendMessage" || x.method === "editMessageText")
  && x.body?.chat_id === id)?.body;

/* ---- ١) ★ بلا الترويسة السرّية ما في شي بيصير ---- */
sent.length = 0;
let r = await post(msg("/start"), null);
check("★ بلا الترويسة السرّية ← 403", r.status === 403);
check("★ وما انبعت ولا رسالة", sent.length === 0);
r = await post(msg("/start"), "wrong");
check("★ وبترويسة غلط كمان ← 403", r.status === 403);

/* ---- ٢) /start بيعرض اللغات ---- */
sent.length = 0;
await post(msg("/start"));
check(`اللغات الأربعة ظهرت (${flat().length})`, flat().length === 4);
check("★ وفيهن العربي والأوكراني والإنكليزي",
      ["g|ar","g|uk","g|en","g|de"].every(d => flat().some((b: any) => b.callback_data === d)));

/* ---- ٣) اختيار اللغة = تغيير اللغة وبس (ما بيفوّت عالتجريبي) ----
   قبل، اختيار اللغة كان بيفوّت مباشرة عالنسخة المجانية. هلّأ بس بيغيّر
   اللغة وبيجدّد القائمة الثابتة بلغتها؛ التجريبي صار باختيار صريح من القائمة. */
sent.length = 0;
await post(click("g|ar"));
// اختيار اللغة: منشيل رسالة اختيار اللغة، ومنبعت الترحيب ومعه القائمة
// الثابتة بلغته بـرسالة وحدة — بلا رسالة «اختار من القائمة» زيادة.
const introMsg = last("sendMessage");
check("★★ اختيار اللغة بيرحّب بلغته العربية (رسالة وحدة)",
      /رمز مجّاني/.test(String(introMsg?.text)) && /٢٤ ساعة/.test(String(introMsg?.text))
      && !/kostenlos|Welcome/.test(String(introMsg?.text)));
check("★★ وما بيفوّت عالتجريبي — بلا أزرار مؤسسة/درجة",
      (introMsg?.reply_markup?.inline_keyboard ?? []).flat().length === 0);
check("★★ والقائمة الثابتة بلغته بنفس الرسالة (مو رسالة زيادة)",
      (introMsg?.reply_markup?.keyboard ?? []).flat()
        .some((btn: any) => String(btn.text).includes("نسختي التجريبية")));
check("★★ وبيشيل رسالة اختيار اللغة (deleteMessage)",
      sent.some(x => x.method === "deleteMessage"));

/* ---- ٣ب) التجريبي: مؤسسة وحدة ← بيقفز للدرجات مباشرة ---- */
sent.length = 0;
await post(msg("🎁 نسختي التجريبية"));
const stufen = flat().filter((b: any) => String(b.callback_data).startsWith("l|"));
check(`★ مؤسسة وحدة ← بيقفز للدرجات مباشرة (${stufen.length})`, stufen.length >= 1);
check("★ والنص بالعربي", /اختار المستوى/.test(String(screenNow()?.text)));

/* ---- ٣ج) التجريبي: مؤسستين ← بيسأل عن المؤسسة أول ---- */
// اسم مؤسسة ما بيتصادم مع يلي بتخلّفه اختبارات SQL —
// (provider, stufe) عليها فهرس فريد
psql(`insert into levels (id,title,provider,stufe,published)
        values ('bot-x-b1','BotPruefung B1','BotPruefung','B1',true);
      insert into tests (level_id,slug,title,blocks,aufgaben,published,sort)
        values ('bot-x-b1','bot-x-01','X Modell 1','[]'::jsonb,0,true,1);`);
sent.length = 0;
await post(msg("🎁 نسختي التجريبية"));
const provs = flat().filter((b: any) => String(b.callback_data).startsWith("p|"));
check(`★ مؤسستين ← بيسأل عن المؤسسة أول (${provs.map((b:any)=>b.text).join(', ')})`,
      provs.length === 2);
sent.length = 0;
await post(click("p|ar|BotPruefung"));
check("★★ و«رجوع» ما بيعيد الشرح — بيلخبط مو بيساعد",
      !sent.some(x => /رمز مجّاني/.test(String(x.body?.text))));
check("★ واختيار المؤسسة بيعرض درجاتها هي بس",
      flat().some((b: any) => b.callback_data === "l|ar|bot-x-b1")
      && !flat().some((b: any) => b.callback_data === "l|ar|b1"));
check("★ ومعها زرّ رجوع", flat().some((b: any) => b.callback_data === "b|ar"));
psql(`delete from tests where level_id='bot-x-b1';
      delete from levels where id='bot-x-b1';`);

/* ---- ٤) اختيار الدرجة ← الكود ---- */
sent.length = 0;
await post(click("l|ar|b1"));
const out = String(codeMsg()?.text ?? "");
const code = (out.match(/<code>([A-Z0-9]+)<\/code>/) ?? [])[1];
check(`★ رجّع كود (${code})`, !!code && /^B1[0-9]{10}$/.test(code));
check("★ ومعه الرابط", out.includes("https://b1-telc.example.dev"));
check("★ والنص بالعربي مو بالألماني",
      /تفضّل|الرمز/.test(out) && !/Willkommen/.test(out));

const saved = psql(`select count(*) from access_codes where note = 'telegram:${TG_ID}';`);
check(`الكود انحفظ بالقاعدة (${saved})`, saved === "1");
const shape = psql(`select duration_days || '/' || duration_hours || '/' || max_uses
                    || '/' || array_length(test_slugs,1)
                    from access_codes where note='telegram:${TG_ID}';`);
check(`★ تجريبي فعلاً: ٠ يوم/٢٤ ساعة/تفعيل واحد/امتحان واحد (${shape})`,
      shape === "0/24/1/1");

/* ---- ٥) ★ نفس الحساب بيرجع ← نفس الكود ---- */
sent.length = 0;
await post(click("l|ar|b1"));
const again = String(codeMsg()?.text ?? "");
check("★ الطلب التاني بيقول إنه تكرار",
      /أخدت نسختك/.test(again) && again.includes(code!));
check(`★ وما انولّد كود تاني`,
      psql(`select count(*) from access_codes where note like 'telegram:%';`) === "1");

/* ---- ٦) اللغة بتتبع الزرّ، مو الجهاز ---- */
sent.length = 0;
await post(click("l|de|b1", "ar"));
check("★ زرّ ألماني ← رسالة ألمانية حتى لو جهازه عربي",
      /Testversion|derselbe Code/.test(String(codeMsg()?.text)));
sent.length = 0;
await post(click("l|uk|b1", "ar"));
check("★ وأوكراني كمان", /пробн/i.test(String(codeMsg()?.text)));

/* ---- ٧) مستوى مو موجود ← رسالة خطأ مو انهيار ----
   بحساب جديد: مين عنده كود بياخد كوده بلا ما يتفحص المستوى أصلاً. */
sent.length = 0;
r = await post({ callback_query: { id: "cb9", data: "l|ar|nope",
  from: { id: 55501, username: "neu", language_code: "ar" },
  message: { chat: { id: 55501 } } } });
check("مستوى مو موجود: بيرد ٢٠٠ ما بينهار", r.status === 200);
check(`★ وبيبعت رسالة خطأ مفهومة (${String(last()?.text).slice(0,24)})`,
      /خطأ/.test(String(last()?.text)));
check("★ وما انولّد ولا كود",
      psql(`select count(*) from access_codes where note='telegram:55501';`) === "0");

/* ---- ٨) أي نص تاني بيرجّعه لاختيار اللغة — بس كـ«تبديل» (gl)، مو ترحيب ----
   نصّ غير متوقّع لازم بس يسأل عن اللغة تا يعرف لغته؛ اختياره وقتها تبديل
   لغة (بلا شاشة النسخة المجانية)، مو إعادة onboarding. /start لحاله بيرحّب. */
sent.length = 0;
await post(msg("مرحبا"));
check("نص عادي بيرجّعه لاختيار اللغة (تبديل gl، مو ترحيب)",
      flat().length === 4 && flat().every((b: any) => String(b.callback_data).startsWith("gl|")));

/* ---- ٩) تحديث ناقص ما بينهار ---- */
r = await post({ update_id: 1 });
check("تحديث بلا رسالة بيرد ٢٠٠", r.status === 200);
r = await post("not json" as any);
check("جسم مو JSON بيرد ٢٠٠", r.status === 200);

/* ---- ١٠) الوصول الكامل: الطلب ---- */
psql(`delete from access_requests; delete from bot_admins;`);
const GROUP = -1004242;           // مجموعة الموافقات
const BOSS  = 700001;             // إنت — عضو فيها
const MATE  = 700002;             // شريكك — عضو كمان، وما هو مسجّل لحاله
sent.length = 0;
await post(click("l|ar|b1"));     // كوده التجريبي (تكرار)
check(`★ مع الكود بتطلع لوحة ثابتة (${perm(TG_ID).length} أزرار)`,
      perm(TG_ID).length === 5);
check("★★ والرمز عليه زرّ نسخ بضغطة وحدة",
      (codeMsg()?.reply_markup?.inline_keyboard ?? []).flat()
        .some((b: any) => b.copy_text?.text === code));
check("★★ وبكتلة مميّزة عن باقي النصّ",
      /<blockquote><code>/.test(String(codeMsg()?.text)));
check("★ وهي بالعربي",
      perm(TG_ID).includes("🎁 نسختي التجريبية") && perm(TG_ID).includes("🔓 وصول كامل"));
check("★ وبتضل ظاهرة (is_persistent)",
      toChat(TG_ID)?.reply_markup?.is_persistent === true);

/* ★ ضغطة زرّ بتوصل كنصّ — والنصّ لحاله بيقول اللغة، بلا جدول جلسات */
sent.length = 0;
await post(msg("🌐 اللغة"));
check("★ زرّ «اللغة» بيعرض اللغات بلا ما يكتب /sprache", flat().length === 4);
// ★ تغيير اللغة من القائمة = أزرار «gl» (تبديل لغة بلا شاشة النسخة المجانية)
check("★★ وأزرارها «gl» (تبديل لغة، مو «g» يلي معها ترحيب)",
      flat().length === 4 && flat().every((b: any) => String(b.callback_data).startsWith("gl|")));
sent.length = 0;
await post(click("gl|de"));
const langMsg = last("sendMessage");
check("★★ تغيير اللغة من القائمة بلا ترحيب/نسخة مجانية",
      !/kostenlos|رمز مجّاني|Welcome/.test(String(langMsg?.text)));
check("★★ بس تأكيد قصير + القائمة الثابتة بلغته الجديدة",
      /Sprache geändert/.test(String(langMsg?.text))
      && (langMsg?.reply_markup?.keyboard ?? []).flat()
           .some((btn: any) => String(btn.text).includes("Vollzugang")));

/* ★ getMe فشل: أحسن نصّ بلا رابط من رابط مكسور.
   لازم يجي **قبل** أوّل مشاركة ناجحة — botUsername بتخزّن الاسم
   وما بترجع تسأل، فبعدها ما بينوصل لهالمسار أبداً. */
botName = "";
sent.length = 0;
await post(msg("📣 شارك البوت"));
check("★★ بلا اسم بوت: نصّ بلا رابط مكسور",
      !/t\.me\//.test(String(last()?.text)) && !last()?.reply_markup);
botName = "TestPruefungBot";

sent.length = 0;
await post(msg("📣 Bot teilen", "ar"));
check("★ زرّ ألماني ← رسالة ألمانية حتى لو جهازه عربي",
      /kostenlos/.test(String(last()?.text)));
check("★★ والمشاركة مو تلغرام بس: واتساب كمان",
      flat().some((b: any) => String(b.url).includes("t.me/share"))
      && flat().some((b: any) => String(b.url).includes("wa.me/?text=")));
check("★★ والرابط بـ<code> — ضغطة بتنسخه لأي مطرح",
      /<code>https:\/\/t\.me\/TestPruefungBot<\/code>/.test(String(last()?.text)));


sent.length = 0;
await post(msg("🔓 وصول كامل"));
// ★ المسار الجديد: «وصول كامل» بيختار المؤسسة/الدرجة متل التجريبي. حالة
//   «b1 لحاله» = مؤسسة وحدة → بيقفز عالدرجات مباشرة بزرّ lf (مو شهور فوراً).
const lf = flat().find((b: any) => String(b.callback_data).startsWith("lf|ar|"));
check("★ «وصول كامل» بيختار الدرجة متل التجريبي (زرّ lf، مو شهور فوراً)",
      !!lf && !flat().some((b: any) => String(b.callback_data).startsWith("m|ar|")));

sent.length = 0;
await post(click(String(lf?.callback_data ?? "lf|ar|b1")));   // درجة b1 → شهور
const mf = flat().filter((b: any) => String(b.callback_data).startsWith("mf|ar|"));
check("★ وبعد الدرجة بيسأل لكم شهر (mf محمّل بالمستوى)",
      mf.length === 3 && mf.every((b: any) => String(b.callback_data).endsWith("|b1")));

sent.length = 0;
await post(click("mf|ar|3|b1"));
check("★ الطالب بيوصله «استنى»", /طلبك وصل/.test(String(shown(TG_ID)?.text)));
const adminMsg = toChat(GROUP);
check("★★ والطلب بيوصل المجموعة",
      !!adminMsg && /طلب وصول كامل/.test(String(adminMsg.text)) && /3/.test(String(adminMsg.text)));
const cardKb = adminMsg?.reply_markup?.inline_keyboard?.flat() ?? [];
const reqId = String(cardKb[0]?.callback_data ?? "").split("|")[1] ?? "";
check(`★ وأوّل شي زرّ حجز لحاله (${cardKb.map((b:any)=>b.text).join()})`,
      cardKb.length === 1 && String(cardKb[0].callback_data).startsWith("V|"));
check(`★ ومعه رقم الطلب (${reqId.slice(0, 8)}…)`, /^[0-9a-f-]{36}$/.test(reqId));

/* ---- ٩ب) ★ «كودي» و«جرّب مستوى تاني» ---- */
sent.length = 0;
await post(msg("🎟 كودي"));
const mine = String(shown(TG_ID)?.text ?? "");
check("★★ «كودي» بيرجّع كوده والمستوى وكم باقي",
      new RegExp(`<code>${code}</code>`).test(mine)
      && /telc · B1/.test(mine) && /(ما انفعّل|باقي)/.test(mine));
check("★ ومعه الرابط", mine.includes("https://b1-telc.example.dev"));

// حساب جديد ما أخد ولا كود
sent.length = 0;
await post({ message: { chat: { id: 66601 }, from: { id: 66601 }, text: "🎟 كودي" } });
check("★ ومين ما أخد كود بياخد جواب مفهوم مو رسالة فاضية",
      /ما أخدت ولا كود/.test(String(toChat(66601)?.text)));

// ★ «جرّب مستوى تاني»: b1 انشال، bot-x-b1 معروض
psql(`insert into levels (id,title,provider,stufe,published)
        values ('oth-a2','Other A2','otherprov','A2',true) on conflict do nothing;
      insert into tests (level_id,slug,title,blocks,aufgaben,published,sort)
        values ('oth-a2','oth-01','A2 M1','[]'::jsonb,0,true,1) on conflict do nothing;`);
sent.length = 0;
await post(msg("🎁 نسختي التجريبية"));   // بيعرض المؤسسات — مو المقصود
sent.length = 0;
await post(click("l|ar|b1"));            // نفس كوده + زرّ مستوى تاني
/* ★ «جرّب مستوى تاني» صار جوّا رسالة الكود نفسها مو برسالة تالتة:
   نفس الموضوع، ورسالة زيادة بتزحّط الكود لفوق وبتوسّخ المحادثة. */
const oth = codeMsg();
check("★★ مع الكود بيطلع «جرّب مستوى تاني»",
      /جرّب مستوى تاني/.test(String(oth?.text)));
check("★★ وبنفس رسالة الكود، مو برسالة تالتة",
      (oth?.reply_markup?.inline_keyboard ?? []).flat()
        .some((b: any) => b.copy_text));
const othKb = (oth?.reply_markup?.inline_keyboard ?? []).flat();
check("★★ وفيه المستوى يلي ما جرّبه، وما فيه يلي جرّبه",
      othKb.some((b: any) => b.callback_data === "l|ar|oth-a2")
      && !othKb.some((b: any) => b.callback_data === "l|ar|b1"));
psql(`delete from tests where level_id='oth-a2'; delete from levels where id='oth-a2';`);

/* ---- ١٠ب) ★ الحجز ---- */
const clickAs = (id: number, data: string, msgId = 22) => post({ callback_query: {
  id: "r" + msgId, data, from: { id, username: id === BOSS ? "boss" : "mate" },
  message: { chat: { id: GROUP }, message_id: msgId, text: "طلب" } } });

psql(`insert into bot_admins (telegram_id, label) values (${GROUP}, 'المجموعة')
      on conflict do nothing;`);
sent.length = 0;
await clickAs(BOSS, `V|${reqId}`);
check("★ الحجز بيكتب مين حجزه وكم دقيقة",
      /محجوز لـ@boss/.test(String(lastOf("editMessageText")?.text))
      && /15 دقيقة/.test(String(lastOf("editMessageText")?.text)));
const afterRes = lastOf("editMessageText")?.reply_markup?.inline_keyboard?.flat() ?? [];
check("★ وبعدها بس بتطلع أزرار القرار",
      afterRes.length === 2 && String(afterRes[0].callback_data).startsWith("A|"));
check("★★ واسم الحاجز مكتوب جوّا الأزرار — ما حدا يضغط غلط",
      afterRes.every((b: any) => String(b.text).includes("@boss")));

sent.length = 0;
await clickAs(MATE, `V|${reqId}`);
check("★★ التاني ما بيقدر يحجزه — تنبيه إله لحاله",
      /محجوز لـ@boss/.test(String(lastOf("answerCallbackQuery")?.text)));
sent.length = 0;
await clickAs(MATE, `A|${reqId}`);
check("★★ ولا بيقدر يوافق بدله",
      /محجوز لـ@boss/.test(String(lastOf("answerCallbackQuery")?.text)));
check("★★ وما انعمل كود",
      psql(`select count(*) from access_codes where note like 'telegram-full:%';`) === "0");

/* ---- ١٠ج) ★ انتهى الوقت ---- */
psql(`update access_requests set reserve_until = now() - interval '1 min'
       where id = '${reqId}';`);
sent.length = 0;
await post(msg("شي عادي"));          // أي تحديث بيكنس
await new Promise((r) => setTimeout(r, 250));
check("★★ بعد الانتهاء البوت بينبّه بالمجموعة",
      sent.some(x => x.method === "sendMessage" && x.body?.chat_id === GROUP
                && /انتهى وقت الحجز/.test(String(x.body?.text))));
check("★★ والبطاقة بترجع لزرّ الحجز",
      String(lastOf("editMessageReplyMarkup")?.reply_markup
             ?.inline_keyboard?.[0]?.[0]?.callback_data).startsWith("V|"));
sent.length = 0;
await post(msg("مرّة تانية"));
await new Promise((r) => setTimeout(r, 250));
check("★★ والتنبيه ما بينبعت مرّتين",
      !sent.some(x => /انتهى وقت الحجز/.test(String(x.body?.text))));

/* ---- ١١) ★★ الحدّ: حدا مو أدمن بيضغط «وافق» ---- */
sent.length = 0;
await post({ callback_query: { id: "cbX", data: `A|${reqId}`,
  from: { id: 777001, username: "liar", language_code: "ar" },
  message: { chat: { id: 777001 }, message_id: 11 } } });
check("★★ غريب ضغط «وافق» ← تنبيه إله لحاله مو رسالة بالمجموعة",
      /ما عندك صلاحية/.test(String(lastOf("answerCallbackQuery")?.text))
      && !sent.some(x => x.method === "sendMessage"));
check("★★ وما انعمل ولا كود كامل",
      psql(`select count(*) from access_codes where note like 'telegram-full:%';`) === "0");
check("★★ والطلب لسا معلّق",
      psql(`select status from access_requests where id='${reqId}';`) === "pending");

/* ---- ١٢) إنت بتوافق ---- */
// ★ منسجّل **المجموعة** مو الأشخاص — العضوية هي الصلاحية
psql(`insert into bot_admins (telegram_id, label) values (${GROUP}, 'المجموعة')
      on conflict (telegram_id) do nothing;`);
sent.length = 0;
await post({ callback_query: { id: "cbA", data: `A|${reqId}`,
  from: { id: BOSS, username: "boss", language_code: "de" },
  message: { chat: { id: GROUP }, message_id: 22, text: "طلب" } } });
const full = psql(`select code || '/' || duration_days || '/' ||
                     coalesce(array_length(test_slugs,1)::text,'كل')
                   from access_codes where note like 'telegram-full:%';`);
check(`★ انعمل كود كامل: ٩٠ يوم وكل الامتحانات (${full})`, /\/90\/كل$/.test(full));
check("★ والطالب وصله الكود",
      /تمّت الموافقة/.test(String(shown(TG_ID)?.text)));
check("★★ ورسالة الطلب انختمت: مين وافق مكتوب",
      /وافق @boss/.test(String(lastOf("editMessageText")?.text)));
check("★★ وBOSS نفسه مو مسجّل — مرق بالعضوية بس",
      psql(`select count(*) from bot_admins where telegram_id = ${BOSS};`) === "0");
check("★★ وأزرارها راحت — ما حدا بيقدر يغيّر القرار",
      lastOf("editMessageText") !== undefined
      && lastOf("editMessageText").reply_markup === undefined);

/* ---- ١٣) ★ ضغطة تانية على نفس الطلب ---- */
sent.length = 0;
await post({ callback_query: { id: "cbA2", data: `A|${reqId}`,
  from: { id: BOSS, username: "boss", language_code: "de" },
  message: { chat: { id: GROUP }, message_id: 22, text: "طلب" } } });
check("★ الموافقة التانية بتقول «سبق وانبتّ فيه»",
      /سبق وانبتّ/.test(String(lastOf("answerCallbackQuery")?.text)));
check("★ وضلّ كود كامل واحد",
      psql(`select count(*) from access_codes where note like 'telegram-full:%';`) === "1");

/* ---- ١٤) الرفض بسبب مختار ---- */
psql(`delete from telegram_users where telegram_id = 55502;`);
await post({ callback_query: { id: "c1", data: "l|de|b1",
  from: { id: 55502, username: "zwei", language_code: "de" },
  message: { chat: { id: 55502 } } } });
await post({ callback_query: { id: "c2", data: "m|de|1",
  from: { id: 55502, username: "zwei", language_code: "de" },
  message: { chat: { id: 55502 } } } });
const req2 = psql(`select id from access_requests where telegram_id=55502 and status='pending';`);
sent.length = 0;
await post({ callback_query: { id: "c3", data: `R|${req2}`,
  from: { id: MATE }, message: { chat: { id: GROUP }, message_id: 33, text: "طلب" } } });
const rk = lastOf("editMessageReplyMarkup")?.reply_markup?.inline_keyboard?.flat() ?? [];
check(`★ «ارفض» بيبدّل الأزرار بأسباب بنفس الرسالة (${rk.length})`,
      rk.length === 5 && rk.filter((b: any) =>
        String(b.callback_data).startsWith("X|")).length === 4);
check("★ ومعهن زرّ سبب بخطّ إيدك",
      rk.some((b: any) => String(b.callback_data).startsWith("W|")));
sent.length = 0;
await post({ callback_query: { id: "c4", data: `X|${req2}|soon`,
  from: { id: MATE }, message: { chat: { id: GROUP }, message_id: 33, text: "طلب" } } });
check("★ الطالب وصله سبب الرفض بلغته هو (ألماني)",
      /nicht bewilligt/.test(String(toChat(55502)?.text))
      && /später/.test(String(toChat(55502)?.text)));
check("★★ وشريكك (عضو تاني، مو مسجّل) قدر يرفض كمان",
      psql(`select decided_by from access_requests where id='${req2}';`) === String(MATE));
check("★★ ورسالة الطلب انختمت بالرفض وبلا أزرار",
      /رفض/.test(String(lastOf("editMessageText")?.text))
      && lastOf("editMessageText").reply_markup === undefined);
check("★ والسبب انحفظ",
      psql(`select reason from access_requests where id='${req2}';`) === "soon");
check("★ ورفض ما بيعمل كود",
      psql(`select count(*) from access_codes where note like 'telegram-full:%';`) === "1");

/* ---- ١٤ب) ★ سبب رفض بخطّ إيدك ---- */
psql(`delete from telegram_users where telegram_id = 55503;`);
await post({ callback_query: { id: "d1", data: "l|de|b1",
  from: { id: 55503, username: "drei", language_code: "de" },
  message: { chat: { id: 55503 } } } });
await post({ callback_query: { id: "d2", data: "m|de|2",
  from: { id: 55503, username: "drei", language_code: "de" },
  message: { chat: { id: 55503 } } } });
const req3 = psql(`select id from access_requests where telegram_id=55503 and status='pending';`);

sent.length = 0;
await post({ callback_query: { id: "d3", data: `W|${req3}|77`,
  from: { id: MATE }, message: { chat: { id: GROUP }, message_id: 77, text: "طلب" } } });
const ask = last();
check("★ زرّ الكتابة بيطلب ردّ (force_reply)",
      ask?.reply_markup?.force_reply === true);
check(`★ والوسم فيه رقم الطلب ورقم الرسالة`,
      String(ask?.text).includes(req3) && /:77/.test(String(ask?.text)));

sent.length = 0;
await post({ message: { chat: { id: GROUP }, from: { id: MATE, username: "mate" },
  text: "Bitte zuerst die Testversion nutzen, danke!",
  reply_to_message: { text: String(ask?.text).replace(/<[^>]+>/g, "") } } });
check("★★ ردّك انبعت للطالب متل ما كتبته",
      /Bitte zuerst die Testversion/.test(String(toChat(55503)?.text)));
check("★★ وبلغته: العنوان ألماني مو عربي",
      /nicht bewilligt/.test(String(toChat(55503)?.text)));
check("★ وانحفظ كامل بالقاعدة",
      psql(`select reason from access_requests where id='${req3}';`)
        === "Bitte zuerst die Testversion nutzen, danke!");
check("★ وبطاقة الطلب انختمت بنفس النص",
      /Bitte zuerst/.test(String(lastOf("editMessageText")?.text))
      && lastOf("editMessageText").message_id === 77);

/* ---- ١٤ج) ★ اللغة بتتحدّث مع الطلب ---- */
psql(`delete from access_requests; delete from telegram_users where telegram_id = 55504;`);
await post({ callback_query: { id: "e1", data: "l|ar|b1",
  from: { id: 55504, username: "vier", language_code: "ar" },
  message: { chat: { id: 55504 } } } });
check("الطالب أخد التجريبي بالعربي",
      psql(`select lang from telegram_users where telegram_id=55504;`) === "ar");
await post({ callback_query: { id: "e2", data: "m|de|1",
  from: { id: 55504, username: "vier", language_code: "ar" },
  message: { chat: { id: 55504 } } } });
check("★★ وطلب الوصول بالألماني ← لغته المحفوظة صارت de",
      psql(`select lang from telegram_users where telegram_id=55504;`) === "de");

/* ---- ١٤د) ★ تنبيه «باقي أقلّ من ساعة» ---- */
// الطالب فعّل كوده، فصار إله اشتراك ينتهي بعد ٢٤ ساعة
psql(`delete from subscriptions;
      insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000009')
        on conflict do nothing;
      insert into profiles (id, is_admin)
        values ('cccccccc-0000-0000-0000-000000000009', false)
        on conflict (id) do nothing;
      insert into subscriptions (user_id, levels, current_period_end,
                                 access_code_id, status)
      select 'cccccccc-0000-0000-0000-000000000009', array['b1'],
             now() + interval '24 hours', d.code_id, 'active'
        from telegram_demos d where d.telegram_id = ${TG_ID} and d.level_id = 'b1';`);
sent.length = 0;
await post(msg("شي عادي"));
await new Promise((r) => setTimeout(r, 300));
check("★ باقيله ٢٤ ساعة: ما في تنبيه",
      !sent.some(x => /أقلّ من ساعة/.test(String(x.body?.text))));

// منقرّب الانتهاء بدل ما ننطر ٢٣ ساعة
psql(`update subscriptions set current_period_end = now() + interval '40 minutes';`);
sent.length = 0;
await post(msg("شي عادي"));
await new Promise((r) => setTimeout(r, 300));
check("★★ باقي ٤٠ دقيقة ← التنبيه وصل الطالب",
      /أقلّ من ساعة/.test(String(shown(TG_ID)?.text)));
check("★★ ومعه زرّ الوصول الكامل — أقوى لحظة بيع",
      (shown(TG_ID)?.reply_markup?.inline_keyboard ?? []).flat()
        .some((b: any) => String(b.callback_data).startsWith("f|")));
sent.length = 0;
await post(msg("شي عادي"));
await new Promise((r) => setTimeout(r, 300));
check("★★ والتنبيه ما بينبعت مرّتين",
      !sent.some(x => /أقلّ من ساعة/.test(String(x.body?.text))));

/* ---- ١٥) ★ /id انشال ---- */
sent.length = 0;
await post(msg("/id"));
check("★ /id ما عاد يكشف أرقام — بيرجّع لاختيار اللغة", flat().length === 4);
sent.length = 0;
await post({ message: { chat: { id: -1001234567890 },
  from: { id: TG_ID, username: "kiko" }, text: "/id" } });
check("★ ولا بالمجموعة كمان",
      !/-1001234567890<\/code>/.test(String(last()?.text ?? "")));

/* ---- ١٧) ★★ شاشة وحدة بتمشي مع الطالب ----
   القاعدة المتعارف عليها ببوتات تلغرام: التنقّل بيعدّل الرسالة،
   والأحداث بتبعت رسالة جديدة. قبل هيك، كل ضغطة كانت تزيد رسالة —
   والمحادثة بتصير عمود قوايم ميتة والطالب بيضيع بينهن. */
{
  const M = 777;
  sent.length = 0;
  await post(clickSame("g|ar", M));
  // تغيير اللغة: بيشيل رسالة اختيار اللغة ويبعت الترحيب ومعه القائمة الثابتة
  // بلغته — رسالة وحدة (القائمة الثابتة لازمها رسالة، فما في تعديل هون).
  check("★★ اختيار اللغة بيشيل رسالة اختيار اللغة (deleteMessage)",
        sent.some(x => x.method === "deleteMessage" && x.body?.message_id === M));
  const sendsA = sent.filter(x => x.method === "sendMessage" && x.body?.chat_id === TG_ID);
  check("★★ وبيبعت رسالة وحدة فيها الترحيب والقائمة الثابتة بلغته",
        sendsA.length === 1
        && /رمز مجّاني/.test(String(sendsA[0].body?.text))
        && (sendsA[0].body?.reply_markup?.keyboard ?? []).flat()
             .some((btn: any) => String(btn.text).includes("نسختي التجريبية")));

  sent.length = 0;
  await post(clickSame("p|ar|telc", M));
  const editsB = sent.filter(x => x.method === "editMessageText");
  check(`★★ واختيار المؤسسة كمان بنفس الرسالة (${editsB[0]?.body?.message_id})`,
        editsB.length === 1 && editsB[0].body.message_id === M
        && /اختار المستوى/.test(String(editsB[0].body.text)));

  // ★ رسالة ما بتنعدّل (انمسحت / قديمة كتير) لازم ما تضيّع الشاشة
  const realFetch2 = globalThis.fetch;
  globalThis.fetch = ((u: any, o?: any) => {
    if (String(u).includes("/editMessageText"))
      return Promise.resolve(new Response(
        JSON.stringify({ ok: false, description: "Bad Request: message to edit not found" }),
        { headers: { "content-type": "application/json" } }));
    return realFetch2(u, o);
  }) as any;
  sent.length = 0;
  await post(clickSame("p|ar|telc", M));
  globalThis.fetch = realFetch2;
  check("★★ ولو الرسالة ما انعدّلت، بيبعت وحدة جديدة بدل ما يختفي",
        sent.some(x => x.method === "sendMessage" && x.body?.chat_id === TG_ID
                       && /اختار المستوى/.test(String(x.body?.text))));
}

/* ---- ١٨) ★★ زرّ قديم: بيبلّش من جديد ----
   الأزرار بتضل بالمحادثة للأبد. مين فتح البوت الصبح وضغط زرّ بعد
   ساعتين كان بيكمّل من نصّ طريق نسيه — ويطلع كود لمستوى ما عاد بدّه
   ياه. خمس دقايق، وبعدها منرجّعه للبداية.
   ★ بلا ذاكرة: الوقت جاي مع التحديث نفسه (date / edit_date). */
{
  const M = 888;
  sent.length = 0;
  await post(clickSame("p|ar|telc", M, 299));          // أقلّ من خمس دقايق
  check("★ زرّ عمره ٢٩٩ ثانية لسا شغّال",
        /اختار المستوى/.test(String(lastOf("editMessageText")?.text)));

  sent.length = 0;
  await post(clickSame("p|ar|telc", M, 301));          // أكتر من خمس دقايق
  const back = lastOf("editMessageText");
  check("★★ وعمره ٣٠١ ثانية بيرجّعه لاختيار اللغة",
        /اختار لغتك/.test(String(back?.text))
        && (back?.reply_markup?.inline_keyboard ?? []).flat().length === 4);
  check("★★ ومعه تنبيه بيشرح ليش، بلغته",
        /مرّ وقت طويل/.test(String(lastOf("answerCallbackQuery")?.text ?? "")));
  check("★★ وبنفس الرسالة — ما بيزيد وحدة جديدة",
        back?.message_id === M
        && !sent.some(x => x.method === "sendMessage" && x.body?.chat_id === TG_ID));

  // ★ التنبيه لازم يكون بلغة الزرّ مو بالعربي دايماً
  sent.length = 0;
  await post({ callback_query: { id: "cb1", data: "p|de|telc",
    from: { id: TG_ID, username: "kiko", language_code: "ar" },
    message: { chat: { id: TG_ID }, message_id: M,
               date: Math.floor(Date.now() / 1000) - 400 } } });
  check("★★ والتنبيه بلغة الزرّ (ألماني) مو بلغة الجهاز",
        /Zu lange her/.test(String(lastOf("answerCallbackQuery")?.text ?? "")));

  // ★ أزرارك إنت مستثناة: بطاقة الطلب بتقعد ساعات وبتضل شغّالة
  sent.length = 0;
  await post({ callback_query: { id: "old1", data: "V|00000000-0000-0000-0000-000000000000",
    from: { id: BOSS, username: "boss" },
    message: { chat: { id: GROUP }, message_id: 42, text: "طلب",
               date: Math.floor(Date.now() / 1000) - 7200 } } });
  check("★★ وبطاقة الطلب بعد ساعتين لسا بتشتغل — ما بترجع لاختيار اللغة",
        !sent.some(x => x.method === "editMessageText"
                        && /اختار لغتك/.test(String(x.body?.text))));
}

/* ---- ١٩) ★★ «قريباً»: على مستوى المؤسسة برّا + على مستوى الدرجة جوا ----
   المصدر القاعدة (عمود soon، بيتدار بزرّ «bald» باللوحة).
   أ) مؤسسة كلها «قريباً» (ما فيها ولا مستوى جاهز) → زرّ معطّل برّا بـ«قريباً»،
      ضغطه تنبيه بلا دخول. ب) مؤسسة فيها جاهز + درجة «قريباً» → بتفوّت جوا،
      والدرجة الغير جاهزة بتطلع «قريباً» لحالها. telc·B1 (id=b1) منشور. */
{
  // ── أ) مؤسسة «قريباً» برّا ──
  psql(`delete from tests where level_id<>'b1'; delete from levels where id<>'b1';`);
  psql(`insert into levels (id,title,provider,stufe,published,soon)
        values ('goethe-a2','Goethe-Zertifikat A2','Goethe','A2',false,true);`);

  // شاشة المؤسسات (عبر زرّ التجريبي): telc جاهزة (زرّ دخول p)، Goethe كلها
  // «قريباً» (زرّ s برّا). اختيار اللغة ما عاد يفوّت هون — صار بزرّ القائمة.
  sent.length = 0;
  await post(msg("🎁 نسختي التجريبية"));
  const btns = flat();
  const telcBtn   = btns.find((b: any) => b.callback_data === "p|ar|telc");
  const goetheBtn = btns.find((b: any) =>
    /Goethe/.test(String(b.text)) && b.callback_data === "s|ar");
  check("★★ مؤسسة جاهزة (telc) = زرّ دخول (p)", !!telcBtn);
  check(`★★ مؤسسة كلها «قريباً» (Goethe) = زرّ معطّل برّا بـ«قريباً»`,
        !!goetheBtn && /قريباً/.test(String(goetheBtn?.text)));

  // ضغط مؤسسة «قريباً»: تنبيه show_alert، بلا كود وبلا دخول للدرجات
  const before = psql(`select count(*) from access_codes;`);
  sent.length = 0;
  await post(click("s|ar", "ar"));
  check("★★ ضغط مؤسسة «قريباً» ← تنبيه show_alert بلغته",
        lastOf("answerCallbackQuery")?.show_alert === true
        && /قريباً/.test(String(lastOf("answerCallbackQuery")?.text)));
  check("★★ وما انولّد ولا كود",
        psql(`select count(*) from access_codes;`) === before);
  psql(`delete from levels where id='goethe-a2';`);

  // ── ب) مؤسسة فيها جاهز + درجة «قريباً» → جوا ──
  psql(`insert into levels (id,title,provider,stufe,published,soon)
        values ('telc-b2s','telc Deutsch B2','telc','B2',false,true);`);
  sent.length = 0;
  await post(msg("🎁 نسختي التجريبية"));   // telc لحالها جاهزة → بيقفز للدرجات
  const inside = flat();
  check("★★ الدرجة الجاهزة (B1) = زرّ دخول (l)",
        inside.some((b: any) => String(b.callback_data).startsWith("l|ar|")));
  check("★★ والدرجة الغير جاهزة (B2) «قريباً» جوا (s)",
        inside.some((b: any) => b.callback_data === "s|ar"
                             && /قريباً/.test(String(b.text))));
  psql(`delete from levels where id='telc-b2s';`);
}

await supa.shutdown(); await tgSrv.shutdown();
const bad = R.filter(x => !x[1]);
console.log(bad.length ? `\n✗ ${bad.length} فشل من ${R.length}` : `\n✓ كل الـ${R.length} اختبارات نجحت`);
Deno.exit(bad.length ? 1 : 0);
