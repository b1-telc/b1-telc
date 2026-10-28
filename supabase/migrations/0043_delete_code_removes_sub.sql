-- =====================================================================
-- 0043_delete_code_removes_sub — حذف الكود بيحذف اشتراكه، + حذف اشتراك مفرد
--
-- (١) admin_delete_code: صار يحذف الاشتراكات المرتبطة بالكود (الوصول بيروح
--     كلياً وبينشال من القائمة)، بدل ما يعطّلها (gesperrt) ويخلّيها معلّقة.
-- (٢) admin_delete_subscription: حذف اشتراك مفرد — لتنظيف الاشتراكات
--     المعلّقة (يلي كودها انحذف قبل هالتعديل) من بروفيل المستخدم.
-- =====================================================================

create or replace function admin_delete_code(p_code_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_code text; v_subs int;
begin
  perform admin_guard();
  select code into v_code from access_codes where id = p_code_id;
  if not found then raise exception 'code_not_found'; end if;

  -- الوصول بيروح كلياً: الاشتراكات المولودة من هالكود بتنحذف (مش بس تتعطّل).
  delete from subscriptions where access_code_id = p_code_id;
  get diagnostics v_subs = row_count;

  delete from access_codes where id = p_code_id;
  perform admin_log('code.delete', 'access_code', p_code_id::text,
                    jsonb_build_object('code', v_code, 'deleted_subs', v_subs));
  return jsonb_build_object('ok', true, 'deleted_subs', v_subs);
end $$;
revoke all on function admin_delete_code(uuid) from public, anon;
grant execute on function admin_delete_code(uuid) to authenticated;

-- حذف اشتراك مفرد (Zugang) — لتنظيف المعلّق أو إزالة وصول يدوياً.
create or replace function admin_delete_subscription(p_sub_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform admin_guard();
  delete from subscriptions where id = p_sub_id;
  if not found then raise exception 'subscription_not_found'; end if;
  perform admin_log('subscription.delete', 'subscription', p_sub_id::text, '{}');
  return jsonb_build_object('ok', true);
end $$;
revoke all on function admin_delete_subscription(uuid) from public, anon;
grant execute on function admin_delete_subscription(uuid) to authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0043.
create or replace function schema_version()
returns int language sql immutable as $$ select 43 $$;
grant execute on function schema_version() to authenticated, anon;
