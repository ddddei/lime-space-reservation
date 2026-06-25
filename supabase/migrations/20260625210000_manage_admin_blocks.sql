create extension if not exists pgcrypto;

create or replace function public.upsert_admin_block(
  input_admin_name text,
  input_admin_phone text,
  input_block_id text,
  input_space_id text,
  input_date date,
  input_start_time text,
  input_end_time text,
  input_reason text
)
returns table (
  block_id text,
  space_id text,
  space_name text,
  date date,
  start_time text,
  end_time text,
  reason text,
  created_by text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_block_id text := nullif(btrim(coalesce(input_block_id, '')), '');
  v_created_by text := btrim(coalesce(input_admin_name, ''));
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_space_id is null or btrim(input_space_id) = '' then
    raise exception '공간을 선택해 주세요.';
  end if;

  if input_date < current_date then
    raise exception '과거 날짜는 차단할 수 없습니다.';
  end if;

  if input_start_time is null or input_end_time is null or input_start_time::time >= input_end_time::time then
    raise exception '종료시간은 시작시간보다 늦어야 합니다.';
  end if;

  if input_reason is null or btrim(input_reason) = '' then
    raise exception '차단 사유를 입력해 주세요.';
  end if;

  if not exists (
    select 1
    from public.spaces s
    where s.space_id::text = input_space_id
      and s.is_active = true
  ) then
    raise exception '존재하지 않거나 비활성화된 공간입니다.';
  end if;

  if exists (
    select 1
    from public.admin_blocks ab
    where ab.space_id::text = input_space_id
      and ab.date = input_date
      and ab.is_active = true
      and (v_block_id is null or ab.block_id::text <> v_block_id)
      and ab.start_time::time < input_end_time::time
      and ab.end_time::time > input_start_time::time
  ) then
    raise exception '같은 공간의 기존 차단 일정과 시간이 겹칩니다.';
  end if;

  if v_block_id is null then
    v_block_id := 'admin-block-' || replace(gen_random_uuid()::text, '-', '');

    insert into public.admin_blocks (
      block_id,
      space_id,
      date,
      start_time,
      end_time,
      reason,
      created_by,
      is_active,
      created_at
    ) values (
      v_block_id,
      input_space_id,
      input_date,
      input_start_time,
      input_end_time,
      btrim(input_reason),
      v_created_by,
      true,
      now()
    );
  else
    update public.admin_blocks ab
    set space_id = input_space_id,
        date = input_date,
        start_time = input_start_time,
        end_time = input_end_time,
        reason = btrim(input_reason),
        is_active = true
    where ab.block_id::text = v_block_id;

    if not found then
      raise exception '차단 일정을 찾을 수 없습니다.';
    end if;
  end if;

  return query
  select
    ab.block_id::text,
    ab.space_id::text,
    s.name::text as space_name,
    ab.date,
    ab.start_time,
    ab.end_time,
    ab.reason,
    ab.created_by,
    ab.is_active,
    ab.created_at
  from public.admin_blocks ab
  join public.spaces s on s.space_id::text = ab.space_id::text
  where ab.block_id::text = v_block_id;
end;
$$;

grant execute on function public.upsert_admin_block(text, text, text, text, date, text, text, text) to anon, authenticated;

create or replace function public.deactivate_admin_block(
  input_admin_name text,
  input_admin_phone text,
  input_block_id text
)
returns table (
  block_id text,
  space_id text,
  space_name text,
  date date,
  start_time text,
  end_time text,
  reason text,
  created_by text,
  is_active boolean,
  created_at timestamptz
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

  update public.admin_blocks ab
  set is_active = false
  where ab.block_id::text = input_block_id;

  if not found then
    raise exception '차단 일정을 찾을 수 없습니다.';
  end if;

  return query
  select
    ab.block_id::text,
    ab.space_id::text,
    s.name::text as space_name,
    ab.date,
    ab.start_time,
    ab.end_time,
    ab.reason,
    ab.created_by,
    ab.is_active,
    ab.created_at
  from public.admin_blocks ab
  join public.spaces s on s.space_id::text = ab.space_id::text
  where ab.block_id::text = input_block_id;
end;
$$;

grant execute on function public.deactivate_admin_block(text, text, text) to anon, authenticated;
