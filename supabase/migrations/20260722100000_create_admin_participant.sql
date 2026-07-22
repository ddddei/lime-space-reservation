-- 관리자 화면에서 참가자(피스메이커)를 직접 추가하는 RPC.
-- 이름 + 전화번호(숫자만) 일치로 기존 참가자를 찾고, 비활성 상태면 재활성화, 활성 상태면 예외 처리한다.
-- 신규 인원은 승인 대기(has_plan/has_budget/has_promotion/has_admin_approval = false) 상태로 시작한다.

create or replace function public.create_admin_participant(
  input_admin_name text,
  input_admin_phone text,
  input_name text,
  input_phone text,
  input_level integer,
  input_memo text default null
)
returns table (
  participant_id text,
  name text,
  phone text,
  phone_last4 text,
  level integer,
  has_plan boolean,
  has_budget boolean,
  has_promotion boolean,
  has_admin_approval boolean,
  max_blocks integer,
  memo text,
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
  v_participant_id text;
  v_max_blocks integer;
  v_memo text;
  v_existing_participant_id text;
  v_existing_is_active boolean;
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

  if input_level not in (1, 2) then
    raise exception 'Level은 1 또는 2만 선택할 수 있습니다.';
  end if;

  v_phone_last4 := right(v_phone_digits, 4);
  v_participant_id := 'pm-' || v_phone_digits;
  v_max_blocks := case input_level
    when 1 then 16
    when 2 then 48
  end;
  v_memo := coalesce(btrim(input_memo), '');

  select p.participant_id::text, p.is_active
    into v_existing_participant_id, v_existing_is_active
  from public.participants p
  where btrim(p.name) = btrim(input_name)
    and regexp_replace(p.phone, '\D', '', 'g') = v_phone_digits
  limit 1;

  if v_existing_participant_id is not null then
    if v_existing_is_active then
      raise exception '이미 등록된 참가자입니다.';
    end if;

    update public.participants p
    set is_active = true,
        level = input_level,
        max_blocks = v_max_blocks,
        memo = v_memo,
        updated_at = now()
    where p.participant_id::text = v_existing_participant_id;

    return query
    select
      p.participant_id::text,
      p.name,
      p.phone,
      p.phone_last4,
      p.level,
      p.has_plan,
      p.has_budget,
      p.has_promotion,
      p.has_admin_approval,
      p.max_blocks,
      p.memo,
      p.is_active,
      p.created_at,
      p.updated_at
    from public.participants p
    where p.participant_id::text = v_existing_participant_id;
    return;
  end if;

  insert into public.participants (
    participant_id, name, phone, phone_last4, level,
    has_plan, has_budget, has_promotion, has_admin_approval,
    max_blocks, memo, is_active, created_at, updated_at
  ) values (
    v_participant_id, btrim(input_name), btrim(input_phone), v_phone_last4, input_level,
    false, false, false, false,
    v_max_blocks, v_memo, true, now(), now()
  );

  return query
  select
    p.participant_id::text,
    p.name,
    p.phone,
    p.phone_last4,
    p.level,
    p.has_plan,
    p.has_budget,
    p.has_promotion,
    p.has_admin_approval,
    p.max_blocks,
    p.memo,
    p.is_active,
    p.created_at,
    p.updated_at
  from public.participants p
  where p.participant_id::text = v_participant_id;
end;
$$;

grant execute on function public.create_admin_participant(text, text, text, text, integer, text) to anon, authenticated;
