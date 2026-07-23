-- 2기 운영 준비: 참가자 기수(cohort) 라벨 + 개인별 사용시간 초기화 기산일(usage_reset_on).
-- 기록은 아무것도 삭제하지 않는다. usage_reset_on 이후(포함) 날짜의 비취소 세션만 사용시간에 합산한다.

-- 1) 컬럼 추가 -----------------------------------------------------------
alter table public.participants add column if not exists cohort text not null default '1기';
alter table public.participants add column if not exists usage_reset_on date;

-- 2) submit_reservation_application: baseline 기준 최소 수정
--    - 참가자 select에 p.usage_reset_on 추가
--    - v_total_used_blocks 집계 where에 usage_reset_on 조건 추가
--    다른 로직(중복·차단·일일한도·회차한도 검사)은 baseline과 동일하게 유지한다.
CREATE OR REPLACE FUNCTION public.submit_reservation_application(input_participant_id text, input_meeting_name text, input_sessions jsonb)
 RETURNS TABLE(meeting_id text, session_id text, applicant_participant_id text, applicant_name text, phone_last4 text, level integer, meeting_name text, purpose text, meeting_status text, session_index integer, space_id text, space_name text, date date, start_time time without time zone, end_time time without time zone, block_count integer, session_status text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_participant record;
  v_space record;
  v_session jsonb;
  v_meeting_id text;
  v_now timestamptz := now();
  v_session_count integer := 0;
  v_requested_blocks integer := 0;
  v_total_used_blocks integer;
  v_daily_blocks integer;
  v_other_space_count integer;
begin
  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참여자 정보가 없습니다.';
  end if;

  if input_meeting_name is null or btrim(input_meeting_name) = '' then
    raise exception '모임명을 입력해 주세요.';
  end if;

  if input_sessions is null
     or jsonb_typeof(input_sessions) <> 'array'
     or jsonb_array_length(input_sessions) = 0 then
    raise exception '신청할 회차 정보가 없습니다.';
  end if;

  select
    p.participant_id::text as participant_id,
    p.name,
    p.phone_last4,
    p.level,
    p.max_blocks,
    p.is_active,
    p.has_admin_approval,
    p.usage_reset_on
  into v_participant
  from public.participants p
  where p.participant_id::text = input_participant_id;

  if v_participant is null then
    raise exception '참여자를 찾을 수 없습니다.';
  end if;

  if not v_participant.is_active then
    raise exception '비활성 참여자는 예약을 신청할 수 없습니다.';
  end if;

  if not v_participant.has_admin_approval then
    raise exception '관리자 승인 후 예약 신청이 가능합니다.';
  end if;

  select coalesce(sum(s.block_count), 0)
  into v_total_used_blocks
  from public.sessions s
  join public.meetings m on m.meeting_id::text = s.meeting_id::text
  where m.applicant_participant_id::text = input_participant_id
    and s.status <> 'cancelled'
    and (v_participant.usage_reset_on is null or s.date >= v_participant.usage_reset_on);

  for v_session in select * from jsonb_array_elements(input_sessions)
  loop
    v_session_count := v_session_count + 1;
    v_requested_blocks := v_requested_blocks + coalesce((v_session ->> 'block_count')::integer, 0);
  end loop;

  if v_session_count > 6 then
    raise exception '한 모임은 최대 6회차까지 신청 가능합니다.';
  end if;

  if v_total_used_blocks + v_requested_blocks > v_participant.max_blocks then
    raise exception '신청 가능 시간(레벨 기준)을 초과했습니다.';
  end if;

  v_meeting_id := 'meeting-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.meetings (
    meeting_id,
    applicant_participant_id,
    applicant_name,
    phone_last4,
    level,
    meeting_name,
    purpose,
    status,
    created_at,
    updated_at
  ) values (
    v_meeting_id,
    input_participant_id,
    v_participant.name,
    v_participant.phone_last4,
    v_participant.level,
    btrim(input_meeting_name),
    '',
    'submitted',
    v_now,
    v_now
  );

  for v_session in select * from jsonb_array_elements(input_sessions)
  loop
    select
      sp.space_id::text as space_id,
      sp.name,
      sp.category,
      sp.is_active,
      sp.is_public_visible
    into v_space
    from public.spaces sp
    where sp.space_id::text = (v_session ->> 'space_id');

    if v_space is null then
      raise exception '존재하지 않는 공간입니다: %', (v_session ->> 'space_id');
    end if;

    if v_space.category <> 'lifestyle'
       or not v_space.is_active
       or not v_space.is_public_visible then
      raise exception '예약할 수 없는 공간입니다: %', v_space.name;
    end if;

    if not exists (
      select 1
      from public.operating_hours oh
      where oh.space_id::text = (v_session ->> 'space_id')
        and oh.day_of_week = extract(dow from (v_session ->> 'date')::date)
        and oh.is_closed = false
        and (v_session ->> 'start_time')::time >= oh.open_time::time
        and (v_session ->> 'end_time')::time <= oh.close_time::time
    ) then
      raise exception '운영 시간 범위를 벗어났습니다.';
    end if;

    if exists (
      select 1
      from public.admin_blocks ab
      where ab.space_id::text = (v_session ->> 'space_id')
        and ab.date = (v_session ->> 'date')::date
        and ab.is_active = true
        and ab.start_time::time < (v_session ->> 'end_time')::time
        and ab.end_time::time > (v_session ->> 'start_time')::time
    ) then
      raise exception '관리자 차단 일정과 겹칩니다.';
    end if;

    if exists (
      select 1
      from public.sessions s
      where s.space_id::text = (v_session ->> 'space_id')
        and s.date = (v_session ->> 'date')::date
        and s.status <> 'cancelled'
        and s.start_time::time < (v_session ->> 'end_time')::time
        and s.end_time::time > (v_session ->> 'start_time')::time
    ) then
      raise exception '기존 예약과 시간이 겹칩니다.';
    end if;

    select coalesce(sum(s.block_count), 0)
    into v_daily_blocks
    from public.sessions s
    join public.meetings m on m.meeting_id::text = s.meeting_id::text
    where m.applicant_participant_id::text = input_participant_id
      and s.date = (v_session ->> 'date')::date
      and s.status <> 'cancelled';

    if v_daily_blocks + coalesce((v_session ->> 'block_count')::integer, 0) > 8 then
      raise exception '하루 최대 4시간을 초과했습니다.';
    end if;

    select count(*)
    into v_other_space_count
    from public.sessions s
    join public.meetings m on m.meeting_id::text = s.meeting_id::text
    where m.applicant_participant_id::text = input_participant_id
      and s.date = (v_session ->> 'date')::date
      and s.status <> 'cancelled'
      and s.space_id::text <> (v_session ->> 'space_id');

    if v_other_space_count > 0 then
      raise exception '하루에는 하나의 공간만 예약할 수 있습니다.';
    end if;

    insert into public.sessions (
      session_id,
      meeting_id,
      session_index,
      space_id,
      date,
      start_time,
      end_time,
      block_count,
      status,
      created_at,
      updated_at
    ) values (
      'session-' || replace(gen_random_uuid()::text, '-', ''),
      v_meeting_id,
      coalesce((v_session ->> 'session_index')::integer, 1),
      (v_session ->> 'space_id'),
      (v_session ->> 'date')::date,
      (v_session ->> 'start_time')::time,
      (v_session ->> 'end_time')::time,
      coalesce((v_session ->> 'block_count')::integer, 0),
      'requested',
      v_now,
      v_now
    );
  end loop;

  return query
  select
    m.meeting_id::text,
    s.session_id::text,
    m.applicant_participant_id::text,
    m.applicant_name,
    m.phone_last4,
    m.level,
    m.meeting_name,
    m.purpose,
    m.status,
    s.session_index,
    s.space_id::text,
    sp.name,
    s.date,
    s.start_time::time,
    s.end_time::time,
    s.block_count,
    s.status,
    s.created_at,
    s.updated_at
  from public.sessions s
  join public.meetings m on m.meeting_id::text = s.meeting_id::text
  join public.spaces sp on sp.space_id::text = s.space_id::text
  where m.meeting_id::text = v_meeting_id
  order by s.session_index;
end;
$function$;

-- 3) get_admin_participants: baseline 기준 returns/select에 cohort, usage_reset_on 추가
--    returns table 변경이라 기존 함수를 drop 후 재생성한다.
drop function if exists public.get_admin_participants(text, text);

CREATE FUNCTION public.get_admin_participants(input_admin_name text, input_admin_phone text)
 RETURNS TABLE(participant_id text, name text, phone text, phone_last4 text, level integer, has_plan boolean, has_budget boolean, has_promotion boolean, has_admin_approval boolean, max_blocks integer, memo text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone, cohort text, usage_reset_on date)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    p.participant_id,
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
    p.updated_at,
    p.cohort,
    p.usage_reset_on
  from public.participants p
  where public.is_valid_admin(input_admin_name, input_admin_phone)
  order by p.is_active desc, p.level desc, p.name asc;
$function$;

grant execute on function public.get_admin_participants(text, text) to anon, authenticated;

-- 4) create_admin_participant: input_cohort 인자 추가 (시그니처 변경 → drop 후 재생성)
--    본문은 기존 20260722100000_create_admin_participant.sql 기준 + cohort 저장/재활성화 갱신.
drop function if exists public.create_admin_participant(text, text, text, text, integer, text);

create function public.create_admin_participant(
  input_admin_name text,
  input_admin_phone text,
  input_name text,
  input_phone text,
  input_level integer,
  input_memo text default null,
  input_cohort text default '1기'
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
  updated_at timestamptz,
  cohort text,
  usage_reset_on date
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
  v_cohort text;
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
  v_cohort := coalesce(nullif(btrim(input_cohort), ''), '1기');

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
        cohort = v_cohort,
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
      p.updated_at,
      p.cohort,
      p.usage_reset_on
    from public.participants p
    where p.participant_id::text = v_existing_participant_id;
    return;
  end if;

  insert into public.participants (
    participant_id, name, phone, phone_last4, level,
    has_plan, has_budget, has_promotion, has_admin_approval,
    max_blocks, memo, is_active, created_at, updated_at, cohort
  ) values (
    v_participant_id, btrim(input_name), btrim(input_phone), v_phone_last4, input_level,
    false, false, false, false,
    v_max_blocks, v_memo, true, now(), now(), v_cohort
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
    p.updated_at,
    p.cohort,
    p.usage_reset_on
  from public.participants p
  where p.participant_id::text = v_participant_id;
end;
$$;

grant execute on function public.create_admin_participant(text, text, text, text, integer, text, text) to anon, authenticated;

-- 5) update_participant_cohort: 관리자 검증 + cohort 값 검증(비어있지 않은 텍스트) 후 갱신
create function public.update_participant_cohort(
  input_admin_name text,
  input_admin_phone text,
  input_participant_id text,
  input_cohort text
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
  updated_at timestamptz,
  cohort text,
  usage_reset_on date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_cohort text;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참여자 정보가 없습니다.';
  end if;

  v_cohort := btrim(coalesce(input_cohort, ''));
  if v_cohort = '' then
    raise exception '기수를 선택해 주세요.';
  end if;

  if not exists (select 1 from public.participants p where p.participant_id::text = input_participant_id) then
    raise exception '참가자를 찾을 수 없습니다.';
  end if;

  update public.participants p
  set cohort = v_cohort,
      updated_at = now()
  where p.participant_id::text = input_participant_id;

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
    p.updated_at,
    p.cohort,
    p.usage_reset_on
  from public.participants p
  where p.participant_id::text = input_participant_id;
end;
$$;

grant execute on function public.update_participant_cohort(text, text, text, text) to anon, authenticated;

-- 6) reset_participant_usage: 관리자 검증 + 대상 존재 확인 후 usage_reset_on = 오늘(KST)로 설정.
--    기록은 아무것도 삭제하지 않는다 — 이후 사용시간 계산의 기산일만 바뀐다.
create function public.reset_participant_usage(
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
  updated_at timestamptz,
  cohort text,
  usage_reset_on date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_exists boolean;
  v_today date;
begin
  select public.is_valid_admin(input_admin_name, input_admin_phone) into v_admin_exists;

  if not v_admin_exists then
    raise exception '관리자 권한을 확인할 수 없습니다.';
  end if;

  if input_participant_id is null or btrim(input_participant_id) = '' then
    raise exception '참여자 정보가 없습니다.';
  end if;

  if not exists (select 1 from public.participants p where p.participant_id::text = input_participant_id) then
    raise exception '참가자를 찾을 수 없습니다.';
  end if;

  v_today := (now() at time zone 'Asia/Seoul')::date;

  update public.participants p
  set usage_reset_on = v_today,
      updated_at = now()
  where p.participant_id::text = input_participant_id;

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
    p.updated_at,
    p.cohort,
    p.usage_reset_on
  from public.participants p
  where p.participant_id::text = input_participant_id;
end;
$$;

grant execute on function public.reset_participant_usage(text, text, text) to anon, authenticated;
