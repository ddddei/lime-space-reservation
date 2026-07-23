-- 관리자 화면에서 관리자 계정을 비활성화하는 RPC.
-- 물리 삭제가 아니라 is_active = false 처리다(admins delete 금지).
-- 잠금 방지: 본인 계정은 비활성화할 수 없고, 활성 관리자가 1명뿐이면 비활성화를 거부한다.

create or replace function public.deactivate_admin_account(
  input_admin_name text,
  input_admin_phone text,
  input_admin_id text
)
returns table (
  admin_id text,
  name text,
  phone text,
  phone_last4 text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_requester_admin_id text;
  v_requester_phone_digits text;
  v_target_is_active boolean;
  v_active_admin_count integer;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_admin_id is null or btrim(input_admin_id) = '' then
    raise exception '관리자를 찾을 수 없습니다.';
  end if;

  select a.is_active into v_target_is_active
  from public.admins a
  where a.admin_id::text = input_admin_id;

  if not found then
    raise exception '관리자를 찾을 수 없습니다.';
  end if;

  -- 본인 계정 여부는 요청자 이름 + 전화번호(숫자만)로 매칭되는 활성 관리자 행으로 판단한다.
  v_requester_phone_digits := regexp_replace(coalesce(input_admin_phone, ''), '\D', '', 'g');

  select a.admin_id::text into v_requester_admin_id
  from public.admins a
  where btrim(a.name) = btrim(input_admin_name)
    and regexp_replace(a.phone, '\D', '', 'g') = v_requester_phone_digits
    and a.is_active = true
  limit 1;

  if v_requester_admin_id is not null and v_requester_admin_id = input_admin_id then
    raise exception '본인 계정은 비활성화할 수 없습니다.';
  end if;

  if v_target_is_active then
    select count(*) into v_active_admin_count
    from public.admins a
    where a.is_active = true;

    if v_active_admin_count <= 1 then
      raise exception '최소 1명의 활성 관리자가 필요합니다.';
    end if;
  end if;

  update public.admins a
  set is_active = false,
      updated_at = now()
  where a.admin_id::text = input_admin_id;

  return query
  select
    a.admin_id::text,
    a.name,
    a.phone,
    a.phone_last4,
    a.role,
    a.is_active,
    a.created_at,
    a.updated_at
  from public.admins a
  where a.admin_id::text = input_admin_id;
end;
$$;

grant execute on function public.deactivate_admin_account(text, text, text) to anon, authenticated;
