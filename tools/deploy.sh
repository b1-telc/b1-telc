#!/usr/bin/env bash
# أمر النشر على Cloudflare Workers.
#
# سبب وجوده: خطوة «إنشاء deployment» بالـAPI تبع Cloudflare بترجّع
# أحياناً 504 Gateway Timeout — عطل مؤقت من طرفهن، مو من الكود ولا
# من البناء (dist/ بكون جاهز وملفاته انرفعت). النتيجة: الـbuild بيفشل
# وبيضطر حدا ينشر يدوياً. هون منعيد المحاولة تلقائياً مع تأخير متصاعد،
# فأغلب الـ504 بتشفى لحالها بلا تدخّل.
#
# wrangler مثبّت على نسخة محدّدة: npx بلا رقم بينزّل الأحدث كل مرة
# (بطيء، وبيكسر لو طلعت نسخة فيها تغيير سلوك).
#
# إعداد Cloudflare → Workers & Pages → b1-telc → Settings → Build:
#   Deploy command:  ./tools/deploy.sh
set -uo pipefail
cd "$(dirname "$0")/.."

WRANGLER="wrangler@4.149.0"
TRIES=4

n=1
while :; do
  echo "→ wrangler deploy (محاولة $n/$TRIES)…"
  if npx --yes "$WRANGLER" deploy; then
    echo "✓ النشر نجح"
    exit 0
  fi
  code=$?
  if [ "$n" -ge "$TRIES" ]; then
    echo "✗ فشل النشر بعد $TRIES محاولات (آخر رمز خروج $code)" >&2
    exit "$code"
  fi
  wait=$((2 ** n))          # 2s, 4s, 8s
  echo "… فشل مؤقت (رمز $code) — إعادة المحاولة بعد ${wait}s" >&2
  sleep "$wait"
  n=$((n + 1))
done
