-- 기존 공간의 운영시간만 갱신하는 RPC.
-- update_admin_space(20260626090000)는 운영시간을 다루지 않으므로 별도로 둔다.
-- 해당 공간의 operating_hours 7행을 delete 후 재삽입한다(같은 함수 안이라 트랜잭션으로 보장됨).
-- 이 delete는 참가자/예약 데이터가 아니라 운영시간 행 교체이며, 반복 실행해도 항상 7행으로 수렴한다.
-- input_operating_hours는 create_admin_space와 동일하게
-- [{"day_of_week":0,"open_time":"09:00","close_time":"21:00","is_closed":false}, ...] 형태의 jsonb 배열이며
-- 반드시 7개 요소여야 한다.

create or replace function public.update_admin_space_operating_hours(
  input_admin_name text,
  input_admin_phone text,
  input_space_id text,
  input_operating_hours jsonb
)
returns table (
  space_id text,
  day_of_week integer,
  open_time text,
  close_time text,
  is_closed boolean
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

  select exists(
    select 1 from public.spaces s where s.space_id::text = input_space_id
  ) into v_space_exists;

  if not v_space_exists then
    raise exception '공간 정보를 찾을 수 없습니다.';
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

  delete from public.operating_hours oh where oh.space_id = input_space_id;

  insert into public.operating_hours (space_id, day_of_week, open_time, close_time, is_closed)
  select
    input_space_id,
    (elem ->> 'day_of_week')::integer,
    elem ->> 'open_time',
    elem ->> 'close_time',
    (elem ->> 'is_closed')::boolean
  from jsonb_array_elements(input_operating_hours) as elem;

  update public.spaces s
  set updated_at = now()
  where s.space_id::text = input_space_id;

  return query
  select
    oh.space_id,
    oh.day_of_week,
    oh.open_time,
    oh.close_time,
    oh.is_closed
  from public.operating_hours oh
  where oh.space_id = input_space_id
  order by oh.day_of_week;
end;
$$;

grant execute on function public.update_admin_space_operating_hours(
  text, text, text, jsonb
) to anon, authenticated;
