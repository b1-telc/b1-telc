-- =====================================================================
-- 0037_delete_code_revokes_sub_and_persist_tg
--
-- (١) حذف كود = قطع الوصول: admin_delete_code بيلغي (revoked) الاشتراكات
--     الفعّالة المرتبطة بالكود قبل ما يمسحه. قبلها كان الاشتراك بيضل
--     شغّال (access_code_id → null)، فالمستخدم بيضل واصل رغم حذف كوده.
--
-- (٢) اسم تلغرام بيثبت: منخزّن telegram_username على الحساب (profiles)
--     وقت التفعيل عبر trigger على code_redemptions. هيك بيضل ظاهر حتى لو
--     انحذف الكود (الرابط القديم كان عبر الكود بس، فبينكسر مع حذفه).
-- =====================================================================

-- عمود ثابت على الحساب — بيعيش بعد حذف الكود، عكس الرابط المحسوب.
alter table profiles add column if not exists telegram_username text;

-- ---------------------------------------------------------------------
-- (٢) التقاط اسم تلغرام عند كل تفعيل كود — trigger بدل تعديل redeem_code
--     (بيشتغل على كل مسارات التفعيل، الحالية والمستقبلية). الكود المفعَّل
--     بيرجع لحساب تلغرام: تجريبي عبر telegram_demos، وصول كامل عبر
--     access_requests، والتنين → telegram_users.username.
-- ---------------------------------------------------------------------
create or replace function trg_capture_tg_username()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_tg text;
begin
  select tu.username into v_tg
    from telegram_users tu
   where tu.telegram_id = coalesce(
           (select telegram_id from telegram_demos  where code_id = new.code_id limit 1),
           (select telegram_id from access_requests where code_id = new.code_id limit 1))
     and tu.username is not null
   limit 1;
  if v_tg is not null then
    update profiles set telegram_username = v_tg where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists capture_tg_username on code_redemptions;
create trigger capture_tg_username
  after insert on code_redemptions
  for each row execute function trg_capture_tg_username();

-- تعبئة أثرية: لكل حساب، اسم تلغرام من آخر كود فعّله (يلي لسا فاضي).
update profiles p
   set telegram_username = s.username
  from (
    select distinct on (cr.user_id) cr.user_id, tu.username
      from code_redemptions cr
      join access_codes ac on ac.id = cr.code_id
      left join telegram_demos  td on td.code_id = ac.id
      left join access_requests ar on ar.code_id = ac.id
      join telegram_users tu on tu.telegram_id = coalesce(td.telegram_id, ar.telegram_id)
     where tu.username is not null
     order by cr.user_id, cr.created_at desc
  ) s
 where p.id = s.user_id and p.telegram_username is null;

-- ---------------------------------------------------------------------
-- admin_users: اسم تلغرام من العمود الثابت أولاً، ومع الرابط المحسوب
-- كاحتياط للتفعيلات القديمة قبل التعبئة.
-- ---------------------------------------------------------------------
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
      -- ★ اسم مستخدم تلغرام: العمود الثابت، ومع الرابط المحسوب احتياطاً.
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
           or p.telegram_username ilike '%' || p_search || '%'
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
-- (١) حذف كود نهائي + قطع الوصول: منلغي الاشتراكات الفعّالة المرتبطة
-- بالكود (revoked) قبل مسحه. الكود وتفعيلاته بينمسحوا، وإشارات تلغرام
-- بتنفكّ (set null). «sperren» ضايل للتعطيل المؤقّت بلا حذف.
-- ---------------------------------------------------------------------
create or replace function admin_delete_code(p_code_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_code text; v_subs int;
begin
  perform admin_guard();
  select code into v_code from access_codes where id = p_code_id;
  if not found then raise exception 'code_not_found'; end if;

  -- قطع الوصول: أي اشتراك فعّال انولد من هالكود بيصير revoked.
  update subscriptions
     set status = 'revoked', updated_at = now()
   where access_code_id = p_code_id and status = 'active';
  get diagnostics v_subs = row_count;

  delete from access_codes where id = p_code_id;
  perform admin_log('code.delete', 'access_code', p_code_id::text,
                    jsonb_build_object('code', v_code, 'revoked_subs', v_subs));
  return jsonb_build_object('ok', true, 'revoked_subs', v_subs);
end $$;
revoke all on function admin_delete_code(uuid) from public, anon;
grant execute on function admin_delete_code(uuid) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0037.
create or replace function schema_version()
returns int language sql immutable as $$ select 37 $$;
grant execute on function schema_version() to authenticated, anon;
