-- =====================================================================
-- 0044_expire_stale_request — الطلب المعلّق المهجور ينتهي بعد 5 دقايق
--
-- المشكلة: مين طلب وصول كامل ونسي، لمّا يرجع يطلب بيلاقي «في طلب سابق»
-- ورابطو قديم → «الطلب السابق قديم». كان بيضل عالق على نفس الطلب.
--
-- الحل: وقت إعادة الطلب، أي طلب معلّق أقدم من 5 دقايق منعتبرو منتهي
-- (rejected/expired)، فبينعمل طلب جديد برابط دفع جديد. الانتهاء بيصير
-- **بس عند إعادة الطلب** — فما بيأثّر على دافع عم يكمّل شراءه بلا ما يعيد.
-- =====================================================================

create or replace function bot_request_access(
  p_telegram_id bigint,
  p_months      int,
  p_lang        text default null,
  p_level_id    text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_u telegram_users%rowtype; v_r access_requests%rowtype; v_lvl levels%rowtype;
        v_lang text; v_level text;
begin
  if p_months is null or p_months < 1 or p_months > 12 then
    raise exception 'months_out_of_range';
  end if;

  select * into v_u from telegram_users where telegram_id = p_telegram_id;
  if not found then raise exception 'no_demo_yet'; end if;

  -- ★ آخر لغة اختارها هي لغته. الردّ بيوصله فيها حتى لو أخد التجريبي بغيرها.
  v_lang := nullif(trim(coalesce(p_lang, '')), '');
  if v_lang is null then
    v_lang := v_u.lang;
  elsif v_lang is distinct from v_u.lang then
    v_lang := left(v_lang, 8);
    update telegram_users set lang = v_lang where telegram_id = p_telegram_id;
  end if;

  -- المستوى المطلوب: يا يلي اختاره بالمسار (متل التجريبي)، يا آخر تجريبي مخزّن
  v_level := coalesce(nullif(trim(coalesce(p_level_id, '')), ''), v_u.level_id);

  -- ★ طلب معلّق مهجور (أقدم من 5 دقايق): منعتبرو منتهي، تا الرجعة تعمل طلب
  --   جديد برابط دفع جديد بدل ما نعلق على «الطلب السابق قديم».
  update access_requests
     set status = 'rejected', reason = 'expired', decided_at = now()
   where telegram_id = p_telegram_id and status = 'pending'
     and created_at < now() - interval '5 minutes';

  select * into v_r from access_requests
   where telegram_id = p_telegram_id and status = 'pending';
  if found then
    select * into v_lvl from levels where id = v_r.level_id;
    return jsonb_build_object('ok', true, 'again', true, 'request_id', v_r.id,
      'months', v_r.months, 'username', v_u.username, 'lang', v_lang,
      'level_id', v_r.level_id, 'stufe', v_lvl.stufe, 'provider', v_lvl.provider);
  end if;

  -- ★ الحارس: مستوى «قريباً» / مسحوب / مجهول ما إله «وصول كامل»
  select * into v_lvl from levels where id = v_level;
  if not found or not v_lvl.published then
    raise exception 'level_unavailable';
  end if;

  insert into access_requests (telegram_id, level_id, months)
  values (p_telegram_id, v_level, p_months)
  returning * into v_r;

  select * into v_lvl from levels where id = v_r.level_id;
  return jsonb_build_object('ok', true, 'again', false, 'request_id', v_r.id,
    'months', v_r.months, 'username', v_u.username, 'lang', v_lang,
    'level_id', v_r.level_id, 'stufe', v_lvl.stufe, 'provider', v_lvl.provider);
end $$;
revoke all on function bot_request_access(bigint, int, text, text)
  from public, anon, authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0044.
create or replace function schema_version()
returns int language sql immutable as $$ select 44 $$;
grant execute on function schema_version() to authenticated, anon;
