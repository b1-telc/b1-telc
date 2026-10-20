-- ============================================================
-- reveal_answers() — وضع التمرين (Goethe)
-- ============================================================
-- زرّ «Antworten anzeigen» بيطلب حلول أسئلة نصّ واحد تا يلوّنها
-- أخضر/أحمر. منرجّع الحلّ **بس** للأسئلة يلي الطالب إله حقّ فيها
-- (امتحان مجاني أو اشتراك ساري) — نفس حارس submit_attempt.
--
-- الفرق عن submit_attempt: هاد **ما بيسجّل محاولة** ولا بيلمس جدول
-- المراجعة (mistakes). تمرين صرف: الطالب بيشوف الصح، وبس.
--
-- ليش دالة لحالها مو submit_attempt؟ submit_attempt بيصحّح البلوك كله
-- ويحسب علامة ويسجّل — ونحنا بالتمرين بدنا نص واحد، بلا علامة، بلا أثر.
-- والحلول بتضل محميّة: ما في جدول بيعطيها إلا عبر هالدالة المحكومة.
-- ============================================================

create or replace function reveal_answers(p_item_ids uuid[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v      jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id',          i.id,
           'answer',      ia.answer,
           'explanation', ia.explanation)), '[]'::jsonb)
    into v
    from items i
    join sections s on s.id = i.section_id
    join tests    t on t.id = s.test_id
    join item_answers ia on ia.item_id = i.id
   where i.id = any(p_item_ids)
     and t.published
     and (t.is_free or has_test_access(v_user, t.level_id, t.slug));

  return jsonb_build_object('ok', true, 'answers', v);
end $$;

-- anon ما إله شي هون: بس المستخدم المسجّل (ولو مجهول) بعد فحص الصلاحية
revoke all on function reveal_answers(uuid[]) from public;
grant execute on function reveal_answers(uuid[]) to authenticated;

-- رقم نسخة المخطّط: اللوحة بتفحصه وبتحذّر لو القاعدة ورا الكود. بلا
-- هالرفع، قاعدة بلا reveal_answers بتقول «محدّثة» والتمرين بيفشل بصمت.
create or replace function schema_version()
returns int language sql immutable as $$ select 32 $$;
grant execute on function schema_version() to authenticated, anon;
