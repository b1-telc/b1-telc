-- =====================================================================
-- 0035_report_spot — التبليغ بيحمل مكان التمرين بالضبط
--
-- قبلها: التبليغ بيوصل مربوط بالامتحان بس («مشكلة بامتحان DTZ · B1»).
-- الأدمن ما بيعرف أي تمرين فيه الغلط — لازم يفتّش الامتحان كلّه. هلّأ كل
-- تمرين (Übung) عنده زرّ إبلاغ، والواجهة بتبعت «القسم · التمرين» (spot)،
-- فاللوحة بتبيّن وين الغلط بالضبط.
--
-- ★ نفس أمان 0030: الـspot نصّ، مو كود — بيتنظّف (حروف تحكّم بتنشال،
--   سطر واحد، طول محدود)، وبينعرض باللوحة بـesc دايماً.
-- =====================================================================

alter table reports add column if not exists spot text;

comment on column reports.spot is
  'مكان التمرين المُبلّغ عنه: «القسم · التمرين» (نصّ عرض، يُنظّف عند الإدخال)';

-- التوقيع القديم (3 وسائط) لازم ينشال قبل الجديد (4 وسائط) تا ما يصير
-- التباس باختيار الدالة.
drop function if exists report_problem(uuid, text, text);

create or replace function report_problem(
  p_test_id uuid,
  p_text    text,
  p_lang    text default null,
  p_spot    text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid := auth.uid();
  v_lim   jsonb := report_limits();
  v_body  text;
  v_lang  text;
  v_spot  text;
  v_test  uuid;
  v_level text;
  v_label text;
  v_n     int;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = 'insufficient_privilege';
  end if;

  v_body := regexp_replace(coalesce(p_text, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g');
  v_body := regexp_replace(v_body, E'\n{3,}', E'\n\n', 'g');
  v_body := btrim(v_body);

  if length(v_body) < (v_lim->>'min_chars')::int then
    return jsonb_build_object('ok', false, 'error', 'too_short');
  end if;
  v_body := left(v_body, (v_lim->>'max_chars')::int);

  select count(*) into v_n from reports
   where user_id = v_user
     and created_at > now() - make_interval(mins => (v_lim->>'window_minutes')::int);
  if v_n >= (v_lim->>'max_per_window')::int then
    return jsonb_build_object('ok', false, 'error', 'too_many');
  end if;

  v_lang := case when p_lang in ('de', 'ar', 'uk') then p_lang end;

  -- ★ الـspot: سطر واحد بس — كل حروف التحكّم (بما فيها السطر والجدولة)
  --   بتنقلب مسافة، والمسافات بتنضغط، وبينقصّ لـ200 حرف. فاضي = null.
  v_spot := regexp_replace(coalesce(p_spot, ''), '[\x00-\x1F\x7F]', ' ', 'g');
  v_spot := btrim(regexp_replace(v_spot, '\s+', ' ', 'g'));
  v_spot := nullif(left(v_spot, 200), '');

  select t.id, t.level_id,
         coalesce(l.provider || ' · ' || l.stufe, l.title, t.level_id) || ' — ' || t.title
    into v_test, v_level, v_label
    from tests t left join levels l on l.id = t.level_id
   where t.id = p_test_id;

  insert into reports (user_id, test_id, level_id, test_label, body, lang, spot)
  values (v_user, v_test, v_level, v_label, v_body, v_lang, v_spot);

  return jsonb_build_object('ok', true);
end $$;
revoke all on function report_problem(uuid, text, text, text) from public, anon;
grant execute on function report_problem(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- القراءة: تبيّن مكان التمرين (spot) كمان
-- ---------------------------------------------------------------------
create or replace function admin_reports(p_status text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform admin_guard();
  select coalesce(jsonb_agg(x order by x->>'created_at' desc), '[]') into r from (
    select jsonb_build_object(
      'id',         rp.id,
      'created_at', rp.created_at,
      'status',     rp.status,
      'body',       rp.body,
      'lang',       rp.lang,
      'user_id',    rp.user_id,
      'name',       p.display_name,
      'test_id',    rp.test_id,
      'test',       coalesce(rp.test_label, t.title),
      'spot',       rp.spot,
      'slug',       t.slug,
      'level_id',   rp.level_id,
      'provider',   l.provider,
      'stufe',      l.stufe) as x
    from reports rp
    left join profiles p on p.id = rp.user_id
    left join tests    t on t.id = rp.test_id
    left join levels   l on l.id = rp.level_id
   where p_status is null or rp.status = p_status
   order by rp.created_at desc
   limit 300
  ) q;
  return r;
end $$;
revoke all on function admin_reports(text) from public, anon;
grant execute on function admin_reports(text) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0035 (مكان التمرين بالتبليغ).
create or replace function schema_version()
returns int language sql immutable as $$ select 35 $$;
grant execute on function schema_version() to authenticated, anon;
