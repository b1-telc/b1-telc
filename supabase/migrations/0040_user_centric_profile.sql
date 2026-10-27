-- =====================================================================
-- 0040_user_centric_profile — اللوحة صارت تتمحور حول المستخدم
--
-- (١) admin_users بيرجّع بروفيل كامل لكل مستخدم:
--     · subs مع «label» مقروء (Goethe · A1) بدل معرّف المستوى.
--     · codes مع id/uses/max_uses/kind/revoked/label — تا البروفيل يعرض
--       الأكواد ويتحكّم فيها (+1 تفعيل، حذف) من مكان واحد.
--
-- (٢) admin_delete_user صار يحذف أكواد المستخدم كمان (يلي ما إلها صاحب
--     تاني) — ما يضل كود يتيم بعد حذف صاحبه. الكود المشترك بيضل.
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
      'tg', coalesce(p.telegram_username, (select tu.username
               from code_redemptions cr
               join access_codes ac on ac.id = cr.code_id
               left join telegram_demos    td on td.code_id = ac.id
               left join access_requests   ar on ar.code_id = ac.id
               join telegram_users tu
                 on tu.telegram_id = coalesce(td.telegram_id, ar.telegram_id)
              where cr.user_id = p.id and tu.username is not null
              order by cr.created_at desc
              limit 1)),
      'note', p.note,
      'created_at', p.created_at,
      'last_seen_at', p.last_seen_at,
      'devices',  (select count(*) from devices  d where d.user_id = p.id),
      'attempts', (select count(*) from attempts a where a.user_id = p.id),
      'best_pct', (select max(pct)  from attempts a where a.user_id = p.id),
      'mistakes', (select count(*) from mistakes m where m.user_id = p.id),

      -- الاشتراكات (الوصول): مع اسم مقروء للمؤسسة·المستوى.
      'subs', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id, 'levels', s.levels,
                 'label', (select string_agg(coalesce(l.provider || ' · ' || l.stufe, lv), ', ')
                             from unnest(s.levels) lv left join levels l on l.id = lv),
                 'status', s.status,
                 'current_period_end', s.current_period_end,
                 'days_left', greatest(0, ceil(extract(epoch from
                               (s.current_period_end - now())) / 86400))::int,
                 'source', s.source,
                 'code', (select ac.code from access_codes ac
                           where ac.id = s.access_code_id))
                 order by s.current_period_end desc), '[]')
               from subscriptions s where s.user_id = p.id),

      -- الأكواد يلي فعّلها هالحساب — مع تفاصيل كاملة للتحكّم من البروفيل.
      'codes', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', ac.id, 'code', ac.code, 'levels', ac.levels,
                  'label', (select string_agg(coalesce(l.provider || ' · ' || l.stufe, lv), ', ')
                              from unnest(ac.levels) lv left join levels l on l.id = lv),
                  'uses', (select count(*) from code_redemptions x where x.code_id = ac.id),
                  'max_uses', ac.max_uses,
                  'revoked', ac.revoked_at is not null,
                  'kind', case when coalesce(array_length(ac.test_slugs, 1), 0) > 0
                               then 'demo' else 'full' end,
                  'at', cr.created_at)
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
           or p.telegram_username ilike '%' || p_search || '%'
           or exists (select 1 from code_redemptions cr
                        join access_codes ac on ac.id = cr.code_id
                       where cr.user_id = p.id
                         and (ac.code ilike '%' || p_search || '%'
                              or (code_norm(p_search) <> ''
                                  and code_norm(ac.code)
                                      like '%' || code_norm(p_search) || '%'))))
  ) t;
  return r;
end $$;
revoke all on function admin_users(text) from public, anon;
grant execute on function admin_users(text) to authenticated;

-- ---------------------------------------------------------------------
-- حذف مستخدم + أكوادو: الأكواد يلي ما إلها صاحب تاني بتنمسح معه. الكود
-- المشترك (فعّلو حدا تاني كمان) بيضل. بعدها بينمسح الحساب وكل بياناتو.
-- ---------------------------------------------------------------------
create or replace function admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_name text; v_is_admin boolean; v_codes int;
begin
  perform admin_guard();
  select display_name, is_admin into v_name, v_is_admin
    from profiles where id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
  if v_is_admin then raise exception 'cannot_delete_admin'; end if;

  -- أكواد هالمستخدم يلي ما حدا تاني فعّلها → بتنمسح.
  with mine as (
    delete from access_codes ac
     where exists (select 1 from code_redemptions cr
                    where cr.code_id = ac.id and cr.user_id = p_user_id)
       and not exists (select 1 from code_redemptions cr2
                        where cr2.code_id = ac.id and cr2.user_id <> p_user_id)
    returning 1)
  select count(*) into v_codes from mine;

  -- الحساب وكل بياناتو (اشتراكات، أجهزة، محاولات، تفعيلات — cascade).
  delete from profiles where id = p_user_id;
  -- وحساب auth نفسه — أفضل جهد.
  begin
    delete from auth.users where id = p_user_id;
  exception when others then null;
  end;

  perform admin_log('user.delete', 'profile', p_user_id::text,
                    jsonb_build_object('name', coalesce(v_name, 'ohne Namen'),
                                       'codes_deleted', v_codes));
  return jsonb_build_object('ok', true, 'codes_deleted', v_codes);
end $$;
revoke all on function admin_delete_user(uuid) from public, anon;
grant execute on function admin_delete_user(uuid) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0040.
create or replace function schema_version()
returns int language sql immutable as $$ select 40 $$;
grant execute on function schema_version() to authenticated, anon;
