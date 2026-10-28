-- =====================================================================
-- 0041_demo_minutes — مدّة التجريبي بالدقائق (ساعة ونص بدل 24 ساعة)
--
-- duration_hours عدد صحيح، فما بيقبل 1.5 ساعة. منضيف عمود دقائق،
-- ومنضمّنه بحساب مدّة الاشتراك بـredeem_code. التجريبي صار 90 دقيقة.
-- الأكواد القديمة duration_minutes=0 → ما بيتغيّر سلوكها.
-- =====================================================================

alter table access_codes add column if not exists duration_minutes int not null default 0;

-- ---------------------------------------------------------------------
-- redeem_code: نفس الدالّة، بس مدّة الاشتراك صارت تضمّ الدقائق كمان.
-- ---------------------------------------------------------------------
create or replace function redeem_code(
  p_code        text,
  p_fingerprint text,
  p_user_agent  text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_code  access_codes%rowtype;
  v_sub   subscriptions%rowtype;
  v_used  int;
  v_wait  int;
  v_res   jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- ★ الحد أول شي: قبل أي استعلام على الأكواد
  v_wait := redeem_blocked_for(p_fingerprint);
  if v_wait > 0 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts',
                              'retry_after', v_wait);
  end if;

  insert into profiles (id) values (v_user) on conflict (id) do nothing;

  select * into v_code from access_codes
   where code_norm(code) = code_norm(p_code)
   for update;                                   -- يمنع تفعيلين بنفس اللحظة

  if not found then
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, false);
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_code.revoked_at is not null then
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, false);
    return jsonb_build_object('ok', false, 'error', 'revoked');
  end if;

  -- نفس الحساب أعاد الإدخال: بنرجّع حالته بلا استهلاك تفعيل وبلا تمديد.
  -- وهاد نجاح، فما بينحسب محاولة فاشلة.
  if exists (select 1 from code_redemptions
              where code_id = v_code.id and user_id = v_user) then
    select * into v_sub from subscriptions
     where user_id = v_user and access_code_id = v_code.id
     order by current_period_end desc limit 1;
    perform register_device(p_fingerprint, p_user_agent);
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, true);
    return jsonb_build_object(
      'ok', true, 'already', true,
      'levels', coalesce(v_sub.levels, v_code.levels),
      'expires_at', v_sub.current_period_end,
      'uses', code_uses(v_code.id), 'max_uses', v_code.max_uses,
      'tests', v_sub.test_slugs);
  end if;

  -- ★ الطاقة: هون بالضبط، بعد ما نتأكد إن الكود صالح وقبل ما نستهلكه.
  -- الكود بيضل ساري — يلي دفع ما بيخسره لأنه إجا بوقت زحمة.
  if capacity_full(v_user) then
    insert into waitlist (user_id, code_id) values (v_user, v_code.id)
      on conflict (user_id) do update set code_id = excluded.code_id;
    -- كود صحيح، فمو محاولة فاشلة: تسجيلها فشل بيقفل عليه الإدخال
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, true);
    return jsonb_build_object('ok', false, 'error', 'waitlist',
      'position', waitlist_position(v_user),
      'total',    (select count(*) from waitlist));
  end if;

  -- حساب جديد: لازم يكون في تفعيل باقي
  v_used := code_uses(v_code.id);
  if v_used >= v_code.max_uses then
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, false);
    return jsonb_build_object('ok', false, 'error', 'code_exhausted',
                              'uses', v_used, 'max_uses', v_code.max_uses);
  end if;

  select * into v_sub from subscriptions
   where user_id = v_user and status = 'active' and levels @> v_code.levels
     and test_slugs is not distinct from v_code.test_slugs
   order by current_period_end desc limit 1;

  if found then
    update subscriptions
       set current_period_end = greatest(current_period_end, now())
                                + make_interval(days => v_code.duration_days,
                                                hours => v_code.duration_hours,
                                                mins => v_code.duration_minutes),
           access_code_id = coalesce(access_code_id, v_code.id),
           updated_at = now()
     where id = v_sub.id
     returning * into v_sub;
  else
    insert into subscriptions (user_id, levels, current_period_end, access_code_id, test_slugs)
    values (v_user, v_code.levels,
            now() + make_interval(days => v_code.duration_days,
                                  hours => v_code.duration_hours,
                                  mins => v_code.duration_minutes),
            v_code.id, v_code.test_slugs)
    returning * into v_sub;
  end if;

  insert into code_redemptions (code_id, user_id, fingerprint, user_agent)
  values (v_code.id, v_user, p_fingerprint, left(p_user_agent, 200));

  delete from waitlist where user_id = v_user;   -- إجا دوره وفات

  update access_codes
     set redeemed_at = coalesce(redeemed_at, now()),
         redeemed_by = coalesce(redeemed_by, v_user)
   where id = v_code.id;

  perform register_device(p_fingerprint, p_user_agent);

  insert into redeem_attempts (user_id, fingerprint, success)
  values (v_user, p_fingerprint, true);

  return jsonb_build_object(
    'ok', true,
    'levels', v_sub.levels,
    'expires_at', v_sub.current_period_end,
    'uses', v_used + 1, 'max_uses', v_code.max_uses,
    'tests', v_sub.test_slugs);
end $$;

-- ---------------------------------------------------------------------
-- bot_demo_code: التجريبي صار 90 دقيقة (0 يوم · 0 ساعة · 90 دقيقة).
-- «hours» بالرد صارت محسوبة (ساعات + دقائق/60) → 1.5 للعرض بالبوت.
-- ---------------------------------------------------------------------
create or replace function bot_demo_code(
  p_telegram_id bigint,
  p_chat_id     bigint,
  p_username    text,
  p_lang        text,
  p_level_id    text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_d    telegram_demos%rowtype;
  v_code access_codes%rowtype;
  v_slug text;
  v_test text;
  v_lvl  levels%rowtype;
  v_new  text;
begin
  if p_telegram_id is null or p_chat_id is null then
    raise exception 'telegram_id_required';
  end if;

  select * into v_lvl from levels where id = p_level_id and published;
  if not found then raise exception 'level_not_found'; end if;

  -- هوّيته بتنحدّث دايماً: آخر لغة وآخر مستوى اختارهن
  insert into telegram_users (telegram_id, chat_id, username, lang, level_id)
  values (p_telegram_id, p_chat_id, left(p_username, 64), left(p_lang, 8), v_lvl.id)
  on conflict (telegram_id) do update
    set chat_id = excluded.chat_id, username = excluded.username,
        lang = excluded.lang, level_id = excluded.level_id;

  -- ★ رجع لنفس المستوى: نفس الكود، مو كود جديد
  select * into v_d from telegram_demos
   where telegram_id = p_telegram_id and level_id = v_lvl.id;
  if found and v_d.code_id is not null then
    select * into v_code from access_codes where id = v_d.code_id;
    if found then
      select t.title into v_test from tests t
       where t.level_id = v_code.levels[1] and t.slug = v_code.test_slugs[1];
      return jsonb_build_object(
        'ok', true, 'again', true, 'code', v_code.code,
        'level_id', v_lvl.id, 'provider', v_lvl.provider, 'stufe', v_lvl.stufe,
        'test', v_test,
        'hours', v_code.duration_hours + v_code.duration_minutes / 60.0,
        'used', code_uses(v_code.id), 'max_uses', v_code.max_uses);
    end if;
  end if;

  -- أول امتحان منشور بالمستوى — هو يلي بينفتح بالتجريبي
  select t.slug, t.title into v_slug, v_test
    from tests t where t.level_id = v_lvl.id and t.published
   order by t.sort, t.slug limit 1;
  if v_slug is null then raise exception 'no_published_test'; end if;

  v_new := new_access_code(v_lvl.id);

  -- ★ القيم مثبّتة: تجريبي وبس. المدّة = 90 دقيقة.
  insert into access_codes (code, levels, duration_days, duration_hours,
                            duration_minutes, test_slugs, max_devices, max_uses, note)
  values (v_new, array[v_lvl.id], 0, 0, 90, array[v_slug], 1, 1,
          'telegram:' || p_telegram_id)
  returning * into v_code;

  insert into telegram_demos (telegram_id, level_id, code_id)
  values (p_telegram_id, v_lvl.id, v_code.id)
  on conflict (telegram_id, level_id) do update set code_id = excluded.code_id;

  -- العمود القديم بيضل يحمل الأخير: bot_request_access بتاخد منه
  -- المستوى يلي الطالب عم يطلب وصول كامل إله
  update telegram_users set code_id = v_code.id where telegram_id = p_telegram_id;

  return jsonb_build_object(
    'ok', true, 'again', false, 'code', v_new,
    'level_id', v_lvl.id, 'provider', v_lvl.provider, 'stufe', v_lvl.stufe,
    'test', v_test,
    'hours', v_code.duration_hours + v_code.duration_minutes / 60.0,
    'used', 0, 'max_uses', 1);
end $$;
revoke all on function bot_demo_code(bigint,bigint,text,text,text)
  from public, anon, authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0041.
create or replace function schema_version()
returns int language sql immutable as $$ select 41 $$;
grant execute on function schema_version() to authenticated, anon;
