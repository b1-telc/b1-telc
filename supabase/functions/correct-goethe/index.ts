/**
 * تصحيح Goethe A1 — Schreiben Teil 2 (رسالة قصيرة) بـGemini.
 *
 * ★ منفصل تماماً عن correct-writing (تصحيح telc/غيره): مسار خاص بغوته،
 *   بمعاييره هو (3 Inhaltspunkte × 3 + Kommunikative Gestaltung × 1 = 10)،
 *   وبمقادير مختلفة لكل معيار. ما بيلمس writing_start/finish ولا جداولهن.
 *
 * وضع تدريب صرف: ما بيسجّل محاولة ولا علامة بالقاعدة — بس بيرجّع تقييم
 *   للعرض (متل reveal_answers بالقراءة). النقاط للإرشاد، مو محفوظة.
 *
 * بيقبل نصّ مكتوب أو صورة حلّ بخط اليد (Gemini Flash بيقرا الخط ويصحّح
 *   بنفس الطلب). بيرجّع كمان النص يلي قراه ليتأكد الطالب.
 *
 * أسرار (نفس اللي عند correct-writing):
 *   GEMINI_API_KEY، SUPABASE_URL، SUPABASE_ANON_KEY
 * النشر:  supabase functions deploy correct-goethe
 */

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-flash-latest";
const BASE  = Deno.env.get("GEMINI_BASE_URL")
           || "https://generativelanguage.googleapis.com/v1beta";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });

type Level = { key: string; label?: string; points: number };
type Criterion = { title: string; hint?: string; levels?: Level[] };

/* الجواب مفروض بالسكيما، مو مرجوّ بالتعليمات: enum للدرجات، وread_text
   فيه النص المقروء (مهم للصورة). */
const SCHEMA = {
  type: "object",
  properties: {
    read_text: { type: "string", description: "Der Text des Lernenden, wortgetreu (bei Foto: so gelesen wie geschrieben)" },
    grades: {
      type: "array",
      description: "Ein Eintrag pro vorgegebenem Kriterium, in derselben Reihenfolge",
      items: {
        type: "object",
        properties: {
          criterion: { type: "string", description: "Name des Kriteriums, wortgleich wie vorgegeben" },
          key:       { type: "string", enum: ["A", "B", "C", "D"], description: "Bewertungsstufe" },
          why:       { type: "string", description: "Ein bis zwei Sätze Begründung, auf Deutsch" },
        },
        required: ["criterion", "key", "why"],
      },
    },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type:       { type: "string", enum: ["Grammatik", "Wortschatz", "Rechtschreibung", "Struktur", "Register"] },
          original:   { type: "string" },
          correction: { type: "string" },
          why:        { type: "string", description: "Kurze, einfache Erklärung auf Deutsch" },
        },
        required: ["type", "original", "correction", "why"],
      },
    },
    corrected: { type: "string", description: "Der vollständige Brief, korrigiert, sonst unverändert" },
    summary:   { type: "string", description: "Zwei bis vier Sätze: was gut war und was zu üben ist" },
  },
  required: ["read_text", "grades", "errors", "corrected", "summary"],
};

const SYSTEM = `Du bist Prüfer/in für die Goethe-Zertifikat A1 Prüfung und bewertest
den Schreiben Teil 2 (eine kurze Mitteilung / einen kurzen Brief, ca. 30 Wörter).

Regeln:
- Antworte ausschließlich auf Deutsch. Der Lernende (Niveau A1) liest die Rückmeldung.
- Bewerte jedes vorgegebene Kriterium genau einmal und übernimm seinen Namen wortgleich.
- Vergib pro Kriterium genau eine der vorgegebenen Stufen und halte dich streng an deren Beschreibung.
- Die drei Inhaltspunkte bewertest du inhaltlich: Ist der jeweilige Leitpunkt klar und
  verständlich bearbeitet? Kleine Sprachfehler zählen nur, wenn sie das Verstehen stören.
- Kommunikative Gestaltung: passende Anrede UND Gruß und ein zum Adressaten passender Stil.
- Liste Sprachfehler einzeln mit dem Originalwortlaut auf; erfinde keine Stellen.
- Bei einem Foto: lies die Handschrift sorgfältig und gib den gelesenen Text in read_text zurück.
- Sei konkret, freundlich und knapp. Keine Floskeln.`;

async function availableModels(key: string): Promise<string> {
  try {
    const r = await fetch(`${BASE}/models?key=${key}`);
    const b = await r.json();
    return (b.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .slice(0, 12).join(", ");
  } catch { return "—"; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "no_session" }, 401);

  const SUPA = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const KEY  = Deno.env.get("GEMINI_API_KEY");
  if (!KEY) return json({ error: "not_configured" }, 500);

  /* ما بنفتح مفتاح Gemini للعالم: لازم جلسة Supabase صالحة (ولو مجهولة) */
  try {
    const u = await fetch(`${SUPA}/auth/v1/user`, {
      headers: { apikey: ANON, authorization: auth },
    });
    if (!u.ok) return json({ error: "no_session" }, 401);
  } catch { return json({ error: "no_session" }, 401); }

  let inp: {
    exam?: string; instruction?: string; leitpunkte?: string[]; min_words?: number;
    criteria?: Criterion[]; text?: string;
    image?: { data?: string; mime?: string };
  };
  try { inp = await req.json(); } catch { return json({ error: "bad_request" }, 400); }

  const criteria = Array.isArray(inp.criteria) ? inp.criteria : [];
  const text = (inp.text ?? "").trim();
  const img  = inp.image && inp.image.data ? inp.image : null;
  if (!criteria.length) return json({ error: "no_rubric" }, 400);
  if (!text && !img)    return json({ error: "empty_text" }, 400);

  const exam = (inp.exam && String(inp.exam).trim()) || "Goethe-Zertifikat A1";

  const levelsText = (c: Criterion) => (c.levels ?? [])
    .map((l) => `    - ${l.key} = ${l.points} Punkte: ${l.label ?? ""}`).join("\n");

  const prompt = [
    `# Aufgabe (${exam} — Schreiben Teil 2)`,
    inp.instruction ?? "",
    (inp.leitpunkte && inp.leitpunkte.length)
      ? `\nLeitpunkte, die der Brief abdecken muss:\n` +
        inp.leitpunkte.map((p, i) => `${i + 1}. ${p}`).join("\n") : "",
    inp.min_words ? `\nEtwa ${inp.min_words} Wörter.` : "",
    `\n# Bewertungskriterien und Stufen`,
    criteria.map((c) =>
      `- **${c.title}**${c.hint ? ` (${c.hint})` : ""}\n${levelsText(c)}`).join("\n"),
    img ? `\n# Text des Lernenden\n(als Foto angehängt — bitte die Handschrift lesen)`
        : `\n# Text des Lernenden\n\`\`\`\n${text}\n\`\`\``,
    `\nBewerte jedes der ${criteria.length} Kriterien und korrigiere den Text.`,
  ].filter(Boolean).join("\n");

  const parts: unknown[] = [{ text: prompt }];
  if (img) parts.push({ inline_data: { mime_type: img.mime || "image/jpeg", data: img.data } });

  const reqBody = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  /* ★ «الموديل مزحوم» (high demand / overloaded) عطل مؤقت من Google —
     منعيد المحاولة تلقائياً بتأخير بسيط قبل ما نستسلم. */
  const isBusy = (status: number, msg: string) =>
    status === 503 || status === 500 || /overload|high demand|try again|unavailable/i.test(msg);

  try {
    let r: Response;
    let body: { error?: { message?: string }; candidates?: unknown[];
                promptFeedback?: { blockReason?: string };
                usageMetadata?: Record<string, number>; modelVersion?: string } | null = null;
    for (let attempt = 0; ; attempt++) {
      r = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${KEY}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: reqBody,
      });
      body = await r.json().catch(() => null);
      if (r.ok || attempt >= 2) break;
      if (!isBusy(r.status, body?.error?.message ?? "")) break;
      await new Promise((res) => setTimeout(res, 900 * (attempt + 1)));   // 0.9s، 1.8s
    }

    if (!r.ok) {
      if (r.status === 429) return json({ ok: false, error: "ai_quota" }, 503);
      if (r.status === 404) {
        const have = await availableModels(KEY);
        return json({ ok: false, error: "bad_model",
                      detail: `GEMINI_MODEL=${MODEL} — verfügbar: ${have}` }, 502);
      }
      if (isBusy(r.status, body?.error?.message ?? ""))
        return json({ ok: false, error: "ai_busy" }, 503);
      throw new Error(body?.error?.message ?? `gemini ${r.status}`);
    }

    const cand = body?.candidates?.[0];
    const blocked = body?.promptFeedback?.blockReason
                 || (cand && cand.finishReason && cand.finishReason !== "STOP");
    if (!cand || blocked) return json({ ok: false, error: "refused" }, 502);

    let out: {
      read_text?: string;
      grades: Array<{ criterion: string; key: string; why: string }>;
      errors: Array<{ type: string; original: string; correction: string; why: string }>;
      corrected: string; summary: string;
    } | null = null;
    try {
      out = JSON.parse(cand.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "");
    } catch { out = null; }

    if (!out?.grades?.length) return json({ ok: false, error: "unparsed" }, 502);

    /* ★ النقاط بتنحسب هون من مقياس كل معيار على حدة (مو جدول واحد) */
    const byTitle = new Map(criteria.map((c) => [c.title.trim().toLowerCase(), c]));
    let sum = 0;
    const graded = out.grades.map((g) => {
      const c = byTitle.get(String(g.criterion).trim().toLowerCase());
      const lvl = (c?.levels ?? []).find((l) => l.key.toUpperCase() === String(g.key).toUpperCase());
      const pts = lvl ? lvl.points : 0;
      sum += pts;
      return { criterion: g.criterion, key: g.key, points: pts, why: g.why };
    });
    const max = criteria.reduce((a, c) =>
      a + Math.max(0, ...(c.levels ?? []).map((l) => l.points)), 0);

    return json({
      ok: true,
      points: Math.round(Math.min(sum, max) * 10) / 10,
      max_points: max,
      grades: graded,
      errors: out.errors ?? [],
      corrected: out.corrected ?? "",
      summary: out.summary ?? "",
      read_text: out.read_text ?? (img ? "" : text),
      usage: { input: body?.usageMetadata?.promptTokenCount,
               output: body?.usageMetadata?.candidatesTokenCount },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: "correction_failed", detail: msg.slice(0, 200) }, 502);
  }
});
