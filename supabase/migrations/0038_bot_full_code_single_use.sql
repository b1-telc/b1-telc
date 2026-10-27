-- =====================================================================
-- 0038_bot_full_code_single_use
--
-- كود الوصول الكامل من البوت صار تفعيل واحد (max_uses=1) بدل 3.
-- قبل: 3 تفعيلات = نفس الكود المدفوع ينفعّل على 3 حسابات مختلفة (تسريب).
-- بعد: تفعيل واحد = الكود بينربط بحساب واحد. max_devices=2 لسا بيخلّي
--      نفس الحساب يفتح جهازين (موبايل + لابتوب). للمزيد: زرّ «+1» بلوحة
--      الأدمن (admin_add_code_use) — فالتحكّم بتفعيلات أكثر صار بالأدمن فقط.
-- =====================================================================

create or replace function bot_decide_request(
  p_admin_telegram_id bigint,
  p_request_id        uuid,
  p_approve           boolean,
  p_reason            text   default null,
  p_chat_id           bigint default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_r access_requests%rowtype; v_u telegram_users%rowtype;
        v_code text; v_id uuid;
begin
  if not (bot_is_admin(p_admin_telegram_id)
          or (p_chat_id is not null and bot_is_admin(p_chat_id))) then
    raise exception 'not_bot_admin';
  end if;

  select * into v_r from access_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'already', v_r.status);
  end if;

  -- ★ محجوز لواحد تاني ولسا وقته: هو يلي بيقرّر. بعد ما ينتهي بيصير حرّ.
  if v_r.reserved_by is not null and v_r.reserved_by <> p_admin_telegram_id
     and v_r.reserve_until > now() then
    return jsonb_build_object('ok', false, 'taken', true,
      'by', v_r.reserved_name, 'until', v_r.reserve_until);
  end if;

  select * into v_u from telegram_users where telegram_id = v_r.telegram_id;

  if p_approve then
    if v_r.level_id is null then raise exception 'level_gone'; end if;
    v_code := new_access_code(v_r.level_id);
    -- ★ تفعيل واحد: كود مدفوع شخصي بينربط بحساب واحد بس. للمزيد استعمل
    --   «+1» بلوحة الأدمن. (max_devices=2 بيخلّي نفس الحساب يفتح جهازين.)
    insert into access_codes (code, levels, duration_days, duration_hours,
                              test_slugs, max_devices, max_uses, note)
    values (v_code, array[v_r.level_id], v_r.months * 30, 0,
            null, 2, 1, 'telegram-full:' || v_r.telegram_id)
    returning id into v_id;

    update access_requests
       set status = 'approved', code_id = v_id, decided_at = now(),
           decided_by = p_admin_telegram_id
     where id = p_request_id;
  else
    update access_requests
       set status = 'rejected', reason = left(p_reason, 300), decided_at = now(),
           decided_by = p_admin_telegram_id
     where id = p_request_id;
  end if;

  return jsonb_build_object('ok', true,
    'status',  case when p_approve then 'approved' else 'rejected' end,
    'code',    v_code,
    'months',  v_r.months,
    'reason',  left(p_reason, 300),
    'chat_id', v_u.chat_id,
    'lang',    v_u.lang,
    'username', v_u.username);
end $$;
revoke all on function bot_decide_request(bigint, uuid, boolean, text, bigint)
  from public, anon, authenticated;

-- رقم نسخة المخطّط: آخر ترحيل هو 0038.
create or replace function schema_version()
returns int language sql immutable as $$ select 38 $$;
grant execute on function schema_version() to authenticated, anon;
