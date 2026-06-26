create or replace function public.update_participant_level(
  input_admin_name text,
  input_admin_phone text,
  input_participant_id text,
  input_level integer
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
  v_max_blocks integer;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참여자 정보를 확인할 수 없습니다.';
  end if;

  if input_level not in (1, 2) then
    raise exception 'Level은 1 또는 2만 선택할 수 있습니다.';
  end if;

  v_max_blocks := case input_level
    when 1 then 16
    when 2 then 48
  end;

  update public.participants p
  set level = input_level,
      max_blocks = v_max_blocks,
      updated_at = now()
  where p.participant_id::text = input_participant_id;

  if not found then
    raise exception '참여자 정보를 찾을 수 없습니다.';
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

grant execute on function public.update_participant_level(text, text, text, integer) to anon, authenticated;
