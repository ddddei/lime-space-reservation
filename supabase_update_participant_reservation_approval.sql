-- Supabase SQL Editor에서 실행하세요.
-- 관리자가 참여자의 예약 승인 상태(participants.has_admin_approval)를 변경하는 RPC.
-- 프론트는 service_role/secret key 없이 anon key로만 이 RPC를 호출합니다.

create or replace function public.update_participant_reservation_approval(
  input_admin_name text,
  input_admin_phone text,
  input_participant_id text,
  input_is_approved boolean
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
  -- 유효한 관리자만 업데이트 가능
  select exists (
    select 1
    from public.admins a
    where a.is_active = true
      and btrim(a.name) = btrim(input_admin_name)
      and regexp_replace(a.phone, '\D', '', 'g') = regexp_replace(input_admin_phone, '\D', '', 'g')
  ) into v_admin_exists;

  if not v_admin_exists then
    raise exception 'invalid admin credentials';
  end if;

  update public.participants p
  set has_admin_approval = input_is_approved,
      is_active = true,
      updated_at = now()
  where p.participant_id::text = input_participant_id;

  if not found then
    raise exception 'participant not found';
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

grant execute on function public.update_participant_reservation_approval(text, text, text, boolean) to anon, authenticated;
