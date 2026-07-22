-- 관리자 화면에서 새 공간을 직접 추가하는 RPC.
-- spaces 1행 insert와 operating_hours 7행(요일별) insert를 같은 함수 안에서 수행해
-- 트랜잭션으로 보장한다(둘 중 하나라도 실패하면 전체 롤백).
-- input_operating_hours는 [{"day_of_week":0,"open_time":"09:00","close_time":"21:00","is_closed":false}, ...]
-- 형태의 jsonb 배열이며 반드시 7개 요소여야 한다.

create or replace function public.create_admin_space(
  input_admin_name text,
  input_admin_phone text,
  input_space_id text,
  input_name text,
  input_category text,
  input_capacity integer,
  input_description text,
  input_image_url text,
  input_features text[],
  input_is_active boolean,
  input_is_public_visible boolean,
  input_requires_admin_unlock boolean,
  input_parent_space_name text,
  input_admin_memo text,
  input_sort_order integer,
  input_operating_hours jsonb
)
returns table (
  space_id text,
  name text,
  category text,
  capacity integer,
  description text,
  image_url text,
  features text[],
  is_active boolean,
  is_public_visible boolean,
  requires_admin_unlock boolean,
  parent_space_name text,
  admin_memo text,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_space_exists boolean;
  v_hour_element jsonb;
  v_day_of_week integer;
  v_open_time text;
  v_close_time text;
  v_is_closed boolean;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_space_id is null or btrim(input_space_id) = '' then
    raise exception '공간 정보를 확인할 수 없습니다.';
  end if;

  if input_name is null or btrim(input_name) = '' then
    raise exception '공간명을 입력해 주세요.';
  end if;

  if input_capacity is null or input_capacity < 1 then
    raise exception '정원은 1명 이상이어야 합니다.';
  end if;

  if input_category is null or input_category not in ('youth-building', 'lifestyle') then
    raise exception '카테고리를 확인할 수 없습니다.';
  end if;

  select exists(
    select 1 from public.spaces s where s.space_id::text = input_space_id
  ) into v_space_exists;

  if v_space_exists then
    raise exception '이미 존재하는 공간입니다.';
  end if;

  if input_operating_hours is null
    or jsonb_typeof(input_operating_hours) <> 'array'
    or jsonb_array_length(input_operating_hours) <> 7 then
    raise exception '운영시간 정보(7일)를 확인할 수 없습니다.';
  end if;

  for v_hour_element in select * from jsonb_array_elements(input_operating_hours)
  loop
    begin
      v_day_of_week := (v_hour_element ->> 'day_of_week')::integer;
      v_open_time := v_hour_element ->> 'open_time';
      v_close_time := v_hour_element ->> 'close_time';
      v_is_closed := (v_hour_element ->> 'is_closed')::boolean;
    exception when others then
      raise exception '운영시간 정보 형식이 올바르지 않습니다.';
    end;

    if v_day_of_week is null or v_open_time is null or v_close_time is null or v_is_closed is null then
      raise exception '운영시간 정보 형식이 올바르지 않습니다.';
    end if;

    if v_day_of_week < 0 or v_day_of_week > 6 then
      raise exception '운영시간 요일 값이 올바르지 않습니다.';
    end if;
  end loop;

  insert into public.spaces (
    space_id, name, category, capacity, description, image_url, features,
    is_active, is_public_visible, requires_admin_unlock, parent_space_name, admin_memo, sort_order,
    created_at, updated_at
  ) values (
    input_space_id, btrim(input_name), input_category, input_capacity,
    coalesce(input_description, ''), coalesce(input_image_url, ''), coalesce(input_features, '{}'::text[]),
    coalesce(input_is_active, true), coalesce(input_is_public_visible, true), coalesce(input_requires_admin_unlock, false),
    coalesce(input_parent_space_name, ''), coalesce(input_admin_memo, ''), coalesce(input_sort_order, 0),
    now(), now()
  );

  insert into public.operating_hours (space_id, day_of_week, open_time, close_time, is_closed)
  select
    input_space_id,
    (elem ->> 'day_of_week')::integer,
    elem ->> 'open_time',
    elem ->> 'close_time',
    (elem ->> 'is_closed')::boolean
  from jsonb_array_elements(input_operating_hours) as elem;

  return query
  select
    s.space_id::text,
    s.name,
    s.category,
    s.capacity,
    s.description,
    s.image_url,
    s.features,
    s.is_active,
    s.is_public_visible,
    s.requires_admin_unlock,
    s.parent_space_name,
    s.admin_memo,
    s.sort_order,
    s.created_at,
    s.updated_at
  from public.spaces s
  where s.space_id::text = input_space_id;
end;
$$;

grant execute on function public.create_admin_space(
  text, text, text, text, text, integer, text, text, text[], boolean, boolean, boolean, text, text, integer, jsonb
) to anon, authenticated;
