-- 2026-07-23 실DB(pg_get_functiondef)에서 덤프한 현행 정의. 저장소에 원본 마이그레이션이 없어 기준용으로 보관.
-- 이 파일을 실행하지 말 것 — 수정은 새 마이그레이션에서 create or replace로 진행한다.

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
    p.has_admin_approval
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
    and s.status <> 'cancelled';

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
$function$
