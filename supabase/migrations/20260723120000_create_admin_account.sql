-- 관리자 화면에서 관리자 계정을 직접 추가하는 RPC.
-- 이름 + 전화번호(숫자만) 일치로 기존 관리자를 찾고, 비활성 상태면 재활성화, 활성 상태면 예외 처리한다.
-- admin_id 생성 규칙은 supabase/manual-sql/02_upsert_admins.sql의 관례('admin-' + 전화번호 숫자)를 따르되,
-- 같은 전화번호(대표번호 등)를 공유하는 관리자가 이미 있으면 이름을 덧붙여 구분한다
-- (예: 'admin-0220668134-청년동', 'admin-0220668134-admin').

create or replace function public.create_admin_account(
  input_admin_name text,
  input_admin_phone text,
  input_name text,
  input_phone text,
  input_role text default null
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
  v_phone_digits text;
  v_phone_last4 text;
  v_role text;
  v_admin_id text;
  v_existing_admin_id text;
  v_existing_is_active boolean;
  v_id_taken boolean;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_name is null or btrim(input_name) = '' then
    raise exception '이름을 입력해 주세요.';
  end if;

  v_phone_digits := regexp_replace(coalesce(input_phone, ''), '\D', '', 'g');
  if length(v_phone_digits) < 10 or length(v_phone_digits) > 11 then
    raise exception '전화번호를 숫자 10~11자리로 입력해 주세요.';
  end if;

  -- 기존 데이터(02_upsert_admins.sql)에서 가장 흔한 role은 'manager'이므로 기본값으로 사용한다.
  v_role := nullif(btrim(coalesce(input_role, '')), '');
  if v_role is null then
    v_role := 'manager';
  end if;

  v_phone_last4 := right(v_phone_digits, 4);

  select a.admin_id::text, a.is_active
    into v_existing_admin_id, v_existing_is_active
  from public.admins a
  where btrim(a.name) = btrim(input_name)
    and regexp_replace(a.phone, '\D', '', 'g') = v_phone_digits
  limit 1;

  if v_existing_admin_id is not null then
    if v_existing_is_active then
      raise exception '이미 등록된 관리자입니다.';
    end if;

    update public.admins a
    set is_active = true,
        role = v_role,
        updated_at = now()
    where a.admin_id::text = v_existing_admin_id;

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
    where a.admin_id::text = v_existing_admin_id;
    return;
  end if;

  v_admin_id := 'admin-' || v_phone_digits;

  select exists(
    select 1 from public.admins a where a.admin_id::text = v_admin_id
  ) into v_id_taken;

  if v_id_taken then
    v_admin_id := v_admin_id || '-' || btrim(input_name);
  end if;

  insert into public.admins (
    admin_id, name, phone, phone_last4, role, is_active, created_at, updated_at
  ) values (
    v_admin_id, btrim(input_name), btrim(input_phone), v_phone_last4, v_role, true, now(), now()
  );

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
  where a.admin_id::text = v_admin_id;
end;
$$;

grant execute on function public.create_admin_account(text, text, text, text, text) to anon, authenticated;

-- 관리자 화면에서 관리자 계정 목록(비활성 포함)을 조회하는 RPC.
-- get_admin_participants 패턴과 동일하게 요청자 권한만 확인하고 전체 행을 반환한다.

create or replace function public.get_admin_accounts(
  input_admin_name text,
  input_admin_phone text
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
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

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
  order by a.is_active desc, a.name asc;
end;
$$;

grant execute on function public.get_admin_accounts(text, text) to anon, authenticated;
