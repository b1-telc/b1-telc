-- =====================================================================
-- 0036_admin_user_tg_and_delete_code
--
-- (١) لوحة «المستخدمين» بتعرض اسم مستخدم تلغرام (@username) جنب الاسم.
--     الحساب على الويب بينربط بحساب تلغرام عبر الكود يلي فعّله: الكود
--     التجريبي من telegram_demos، وكود الوصول الكامل من access_requests،
--     والتنين بيرجعوا لـtelegram_users.username. منعرض آخر حساب تلغرام.
--
-- (٢) حذف كود نهائي: admin_delete_code بيمسح صفّ الكود من access_codes.
--     كل الإشارات إمّا on delete cascade (code_redemptions) أو
--     on delete set null (subscriptions, telegram_*). «sperren» القديم
--     بيضل موجود للتعطيل المؤقّت؛ الحذف للإزالة الدائمة.
-- =====================================================================

create or replace function admin_users(p_search text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform admin_guard();
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') into r from (
    select jsonb_build_object(
      'id', p.id,
      'name', p.display_name,
      -- ★ اسم مستخدم تلغرام للحساب (آخر كود تلغرام فعّله). فاضي = ما في.
      'tg', (select tu.username
               from code_redemptions cr
               join access_codes ac on ac.id = cr.code_id
               left join telegram_demos    td on td.code_id = ac.id
               left join access_requests   ar on ar.code_id = ac.id
               join telegram_users tu
                 on tu.telegram_id = coalesce(td.telegram_id, ar.telegram_id)
              where cr.user_id = p.id and tu.username is not null
              order by cr.created_at desc
              limit 1),
      'note', p.note,
      'created_at', p.created_at,
      'last_seen_at', p.last_seen_at,
      'devices',  (select count(*) from devices  d where d.user_id = p.id),
      'attempts', (select count(*) from attempts a where a.user_id = p.id),
      'best_pct', (select max(pct)  from attempts a where a.user_id = p.id),
      'mistakes', (select count(*) from mistakes m where m.user_id = p.id),

      -- كل الاشتراكات، الأطول أولاً. كل واحد إله id لحاله تا تقدري
      -- تمدّديه أو توقفيه من اللوحة بلا ما تأثري على التاني.
      'subs', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id, 'levels', s.levels, 'status', s.status,
                 'current_period_end', s.current_period_end,
                 'days_left', greatest(0, ceil(extract(epoch from
                               (s.current_period_end - now())) / 86400))::int,
                 'source', s.source,
                 'code', (select ac.code from access_codes ac
                           where ac.id = s.access_code_id))
                 order by s.current_period_end desc), '[]')
               from subscriptions s where s.user_id = p.id),

      -- ★ كل كود فعّله هالحساب — من سجلّ التفعيلات
      'codes', (select coalesce(jsonb_agg(jsonb_build_object(
                  'code', ac.code, 'levels', ac.levels, 'at', cr.created_at)
                  order by cr.created_at desc), '[]')
                from code_redemptions cr
                join access_codes ac on ac.id = cr.code_id
                where cr.user_id = p.id)
    ) as x
    from profiles p
    where not p.is_admin
      and (p_search is null or p_search = ''
           or p.display_name ilike '%' || p_search || '%'
           or p.note ilike '%' || p_search || '%'
           -- البحث كمان لازم يمرق على السجلّ، مو على أول مفعّل
           or exists (select 1 from code_redemptions cr
                        join access_codes ac on ac.id = cr.code_id
                       where cr.user_id = p.id
                         and (ac.code ilike '%' || p_search || '%'
                              -- ★ الكود بينلصق مجموعات: «B1 4827 5193 66»
                              or (code_norm(p_search) <> ''
                                  and code_norm(ac.code)
                                      like '%' || code_norm(p_search) || '%'))))
  ) t;
  return r;
end $$;
revoke all on function admin_users(text) from public, anon;
grant execute on function admin_users(text) to authenticated;

-- ---------------------------------------------------------------------
-- حذف كود نهائي — إزالة دائمة، مش تعطيل. الكود وتفعيلاته بينمسحوا؛
-- الاشتراكات وإشارات تلغرام بتنفكّ (set null) بلا ما تنكسر.
-- ---------------------------------------------------------------------
create or replace function admin_delete_code(p_code_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  perform admin_guard();
  select code into v_code from access_codes where id = p_code_id;
  if not found then raise exception 'code_not_found'; end if;
  delete from access_codes where id = p_code_id;
  perform admin_log('code.delete', 'access_code', p_code_id::text,
                    jsonb_build_object('code', v_code));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function admin_delete_code(uuid) from public, anon;
grant execute on function admin_delete_code(uuid) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0036.
create or replace function schema_version()
returns int language sql immutable as $$ select 36 $$;
grant execute on function schema_version() to authenticated, anon;
