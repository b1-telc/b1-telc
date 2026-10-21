-- =====================================================================
-- 0033_soon — حالة «قريباً / bald» للمستويات، تتحكّمي فيها من لوحة الأدمن
--
-- قبلها: «قريباً» كان بيتحدّد من سرّ BOT_SOON (JSON) بـ Supabase — صعب،
-- وخطر (تنصيص غلط بيكسره)، وبعيد عن اللوحة. هلّأ صار عمود على المستوى
-- نفسه، بزرّ باللوحة، والبوت بياخده مباشرة من القاعدة.
--
-- ثلاث حالات حصرية للمستوى:
--   published = true              → online    (يعطي كود بالبوت)
--   soon = true, published = false → bald      (يظهر «قريباً» بلا كود)
--   كلاهما false                   → versteckt (مخفي تماماً)
-- المنشور دايماً بيغلب: لو صار المستوى منشور بينمسح soon، ولو انحطّ
-- «قريباً» بينلغى نشره — فما بيجتمعوا أبداً.
-- =====================================================================

alter table levels add column if not exists soon boolean not null default false;

comment on column levels.soon is
  'يظهر بالبوت كـ«قريباً» (زرّ معطّل) بدل ما يعطي كود — يُدار من اللوحة';

-- ---------------------------------------------------------------------
-- upsert المستوى: نفس السابق تماماً + سطر واحد — المنشور بيمسح «قريباً»
-- (ما إله معنى مستوى منشور و«قريباً» بنفس الوقت).
-- ---------------------------------------------------------------------
create or replace function admin_upsert_level(
  p_id        text,
  p_title     text,
  p_sort      int     default 0,
  p_published boolean default false,
  p_provider  text    default null,
  p_stufe     text    default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_prov  text := nullif(trim(coalesce(p_provider, '')), '');
  v_stufe text := nullif(upper(trim(coalesce(p_stufe, ''))), '');
  v_id    text := nullif(trim(coalesce(p_id, '')), '');
  v_title text;
begin
  perform admin_guard();

  -- معرّف مولّد: goethe-b1، oesd-a2 … بيوفّر تفكير وبيخلّي الأسماء منتظمة
  if v_id is null then
    if v_prov is null or v_stufe is null then
      raise exception 'provider_and_stufe_required';
    end if;
    v_id := slug_de(v_prov) || '-' || lower(v_stufe);
  end if;

  if v_id !~ '^[a-z][a-z0-9_-]{0,31}$' then raise exception 'bad_level_id'; end if;

  v_title := nullif(trim(coalesce(p_title, '')), '');
  if v_title is null then
    v_title := trim(coalesce(v_prov, '') || ' ' || coalesce(v_stufe, v_id));
  end if;

  insert into levels (id, title, sort, published, provider, stufe)
  values (v_id, v_title, p_sort, p_published, v_prov, v_stufe)
  on conflict (id) do update
    set title = excluded.title, sort = excluded.sort,
        published = excluded.published,
        -- المنشور بيمسح «قريباً»؛ الإخفاء ما بيلمسه (يرجع versteckt بسلاسة)
        soon = case when excluded.published then false else levels.soon end,
        -- null ما بيمحي قيمة موجودة: نداء ما بيمرّر الأعمدة الجديدة ما
        -- لازم يفرّغها
        provider = coalesce(excluded.provider, levels.provider),
        stufe    = coalesce(excluded.stufe,    levels.stufe);

  perform admin_log('level.upsert', 'level', v_id,
    jsonb_build_object('title', v_title, 'provider', v_prov,
                       'stufe', v_stufe, 'published', p_published));
  return jsonb_build_object('ok', true, 'id', v_id, 'title', v_title,
                            'provider', v_prov, 'stufe', v_stufe);
end $$;

revoke all on function admin_upsert_level(text,text,int,boolean,text,text) from public;
grant execute on function admin_upsert_level(text,text,int,boolean,text,text)
  to authenticated;

-- ---------------------------------------------------------------------
-- زرّ «قريباً» باللوحة: بيضبط soon، ولمّا يتفعّل بيلغي النشر (حصري).
-- ---------------------------------------------------------------------
create or replace function admin_set_level_soon(p_id text, p_soon boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  update levels
     set soon = coalesce(p_soon, false),
         -- «قريباً» ومنشور ما بيجتمعوا: تفعيل «قريباً» بيلغي النشر
         published = case when coalesce(p_soon, false) then false else published end
   where id = p_id;
  if not found then raise exception 'level_not_found'; end if;
  perform admin_log('level.soon', 'level', p_id,
                    jsonb_build_object('soon', coalesce(p_soon, false)));
  return jsonb_build_object('ok', true, 'id', p_id, 'soon', coalesce(p_soon, false));
end $$;

revoke all on function admin_set_level_soon(text, boolean) from public;
grant execute on function admin_set_level_soon(text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- مستويات «قريباً» للبوت: المعلّمة soon والمو منشورة. المنشور بيغلب،
-- فمستوى منشور ما بيطلع «قريباً» ولو كان soon لسا مضبوط.
-- ---------------------------------------------------------------------
create or replace function bot_soon_levels()
returns jsonb
language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id, 'provider', l.provider, 'stufe', l.stufe, 'title', l.title)
           order by l.provider nulls last, stufe_rank(l.stufe), l.id), '[]')
    from levels l
   where l.soon and not l.published;
$$;

revoke all on function bot_soon_levels() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- admin_content: اللوحة لازم تعرف حالة «قريباً» كمان (soon)
-- ---------------------------------------------------------------------
create or replace function admin_content(p_level_id text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform admin_guard();
  select jsonb_build_object(
    'levels', (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', id, 'title', title, 'sort', sort, 'published', published,
                 'soon', soon, 'provider', provider, 'stufe', stufe,
                 'tests', (select count(*) from tests t where t.level_id = l.id))
               order by coalesce(provider, 'zz'), stufe_rank(stufe), stufe, sort),
               '[]') from levels l),
    'tests', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', t.id, 'slug', t.slug, 'title', t.title, 'level_id', t.level_id,
                'published', t.published, 'is_free', t.is_free, 'aufgaben', t.aufgaben,
                'sections', (select count(*) from sections s where s.test_id = t.id),
                'answers', (select count(*) from item_answers ia
                             join items i on i.id = ia.item_id
                             join sections s on s.id = i.section_id
                            where s.test_id = t.id))
              order by t.level_id, t.sort), '[]')
              from tests t
             where p_level_id is null or t.level_id = p_level_id),
    'resources', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', id, 'title', title, 'level_id', level_id,
                    'published', published, 'sort', sort,
                    'length', length(coalesce(body, '')))
                  order by sort), '[]') from resources),
    'imports', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', id, 'level_id', level_id, 'status', status,
                  'created_at', created_at, 'test_id', test_id,
                  'title', parsed->>'title',
                  'raw_length', length(coalesce(raw_text, '')))
                order by created_at desc), '[]')
                from (select * from imports order by created_at desc limit 30) q)
  ) into r;
  return r;
end $$;

revoke all on function admin_content(text) from public;
grant execute on function admin_content(text) to authenticated;

-- شاشة البداية كمان: تعرض حالة «قريباً»
create or replace function admin_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  perform admin_guard();
  select jsonb_build_object(
    'users',           (select count(*) from profiles where not is_admin),
    'active_subs',     (select count(*) from subscriptions
                         where status = 'active' and current_period_end > now()),
    'expiring_7d',     (select count(*) from subscriptions
                         where status = 'active'
                           and current_period_end between now() and now() + interval '7 days'),
    'expired',         (select count(*) from subscriptions
                         where status <> 'active' or current_period_end <= now()),
    'codes_unused',    (select count(*) from access_codes
                         where redeemed_at is null and revoked_at is null),
    'attempts_7d',     (select count(*) from attempts
                         where submitted_at > now() - interval '7 days'),
    'tests_published', (select count(*) from tests where published),
    'reports_open',    (select count(*) from reports where status = 'new'),
    'levels',          (select coalesce(jsonb_agg(jsonb_build_object(
                                 'id', id, 'title', title, 'published', published,
                                 'soon', soon, 'provider', provider, 'stufe', stufe)
                               order by coalesce(provider, 'zz'),
                                        stufe_rank(stufe), stufe, sort), '[]')
                        from levels)
  ) into r;
  return r;
end $$;

-- رقم نسخة المخطّط: آخر ترحيل هو 0033 (حالة «قريباً» للمستويات).
create or replace function schema_version()
returns int language sql immutable as $$ select 33 $$;
grant execute on function schema_version() to authenticated, anon;
