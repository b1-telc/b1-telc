-- =====================================================================
-- 0042_redeem_already_full — تفعيل كود لمستوى عندك وصول كامل إلو
--
-- لو الطالب عندو وصول كامل فعّال لمستوى (test_slugs = null = كل الامتحانات)،
-- وفعّل كود أضيق لنفس المستوى (تجريبي = test_slugs محدّدة)، التفعيل ما
-- بيضيف شي. قبل: بينعمل اشتراك مكرّر بصمت ويُستهلك تفعيل الكود. بعد:
-- منرجّع «already_full» بلا ما نستهلك الكود، والتطبيق بيعرض رسالة واضحة.
-- (كود وصول كامل تاني test_slugs=null بيضل يمدّد عادي — الفحص للأضيق فقط.)
-- =====================================================================

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

  -- ★ عندو وصول كامل فعّال أشمل لنفس المستوى(ات)، والكود أضيق (تجريبي/جزئي):
  -- التفعيل ما بيضيف شي، فمنقلّه بلا ما نستهلك الكود ولا نعمل اشتراك مكرّر.
  if v_code.test_slugs is not null and exists (
       select 1 from subscriptions s
        where s.user_id = v_user and s.status = 'active'
          and s.current_period_end > now()
          and s.test_slugs is null
          and s.levels @> v_code.levels
     ) then
    insert into redeem_attempts (user_id, fingerprint, success)
    values (v_user, p_fingerprint, true);   -- كود صحيح، مو محاولة فاشلة
    return jsonb_build_object('ok', false, 'error', 'already_full',
                              'levels', v_code.levels);
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

-- رقم نسخة المخطّط: آخر ترحيل هو 0042.
create or replace function schema_version()
returns int language sql immutable as $$ select 42 $$;
grant execute on function schema_version() to authenticated, anon;
