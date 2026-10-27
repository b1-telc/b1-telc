-- =====================================================================
-- 0039_admin_delete_user
--
-- حذف مستخدم من اللوحة: admin_delete_user بيشيل الحساب وكل بياناتو
-- (اشتراكات، أجهزة، محاولات، أخطاء، تفعيلات — كلها on delete cascade من
-- profiles). منستعملو لتنظيف حسابات مكرّرة لنفس الشخص (متل نفس الشخص
-- فعّل كود بجلستين → حسابين). حساب الأدمن محميّ.
--
-- حساب auth نفسه بينمسح لو سمحت الصلاحيات (service_role/postgres بيقدر)،
-- تا ما يرجع يطلع حساب فاضي لو زار التطبيق بنفس الجلسة؛ لو ما في صلاحية،
-- بيكفي حذف profiles (الصفّ بيختفي من اللوحة وكل البيانات بتنمسح).
-- =====================================================================

create or replace function admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_name text; v_is_admin boolean;
begin
  perform admin_guard();
  select display_name, is_admin into v_name, v_is_admin
    from profiles where id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;
  if v_is_admin then raise exception 'cannot_delete_admin'; end if;

  -- الحساب وكل بياناتو (cascade من profiles).
  delete from profiles where id = p_user_id;
  -- وحساب auth نفسه — أفضل جهد، ما بيوقف الحذف لو ما في صلاحية.
  begin
    delete from auth.users where id = p_user_id;
  exception when others then null;
  end;

  perform admin_log('user.delete', 'profile', p_user_id::text,
                    jsonb_build_object('name', coalesce(v_name, 'ohne Namen')));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function admin_delete_user(uuid) from public, anon;
grant execute on function admin_delete_user(uuid) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0039.
create or replace function schema_version()
returns int language sql immutable as $$ select 39 $$;
grant execute on function schema_version() to authenticated, anon;
