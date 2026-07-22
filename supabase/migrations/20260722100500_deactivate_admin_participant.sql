-- 관리자 화면에서 참가자(피스메이커)를 비활성화하는 RPC.
-- 물리 삭제가 아니라 is_active = false 처리다. 참가자는 meetings/sessions와 연결되어 있어
-- 물리 삭제 시 신청 이력이 깨지므로 반드시 논리 삭제(비활성화)만 수행한다.

create or replace function public.deactivate_admin_participant(
  input_admin_name text,
  input_admin_phone text,
  input_participant_id text
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
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참가자를 찾을 수 없습니다.';
  end if;

  update public.participants p
  set is_active = false,
      updated_at = now()
  where p.participant_id::text = input_participant_id;

  if not found then
    raise exception '참가자를 찾을 수 없습니다.';
  end if;

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
  where p.participant_id::text = input_participant_id;
end;
$$;

grant execute on function public.deactivate_admin_participant(text, text, text) to anon, authenticated;
