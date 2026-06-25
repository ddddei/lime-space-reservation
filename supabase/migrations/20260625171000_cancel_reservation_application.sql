-- ⚠️ 이 SQL을 Supabase SQL Editor에 먼저 실행해야 합니다.
--
-- 실행 전 확인 사항: 이 함수는 supabase_submit_reservation_application.sql과 동일한
-- meetings/sessions/participants/admins 테이블 구조를 가정합니다. 실제 컬럼명이 다르면
-- 먼저 information_schema.columns로 확인 후 맞춰주세요.
--
-- 운영 안전을 위해 실제 행 삭제(delete) 대신 상태 변경(meetings.status='cancelled',
-- sessions.status='cancelled')으로 처리합니다.

create or replace function public.cancel_reservation_application(
  input_meeting_id text,
  input_actor_type text,
  input_actor_name text,
  input_actor_phone text
)
returns table (
  meeting_id text,
  meeting_status text,
  cancelled_session_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meeting record;
  v_participant_id text;
  v_admin_exists boolean;
  v_cancelled_count integer;
begin
  if input_meeting_id is null or btrim(input_meeting_id) = '' then
    raise exception '취소할 신청 정보가 없습니다.';
  end if;
  if input_actor_type is null or btrim(input_actor_type) = '' then
    raise exception '취소 요청자 정보가 올바르지 않습니다.';
  end if;

  select m.meeting_id::text as meeting_id,
         m.applicant_participant_id::text as applicant_participant_id,
         m.status
    into v_meeting
  from public.meetings m
  where m.meeting_id::text = input_meeting_id;

  if v_meeting is null then
    raise exception '신청을 찾을 수 없습니다.';
  end if;

  -- participant가 취소하는 경우 본인 신청만 취소 가능
  if input_actor_type = 'participant' then
    select p.participant_id::text
      into v_participant_id
    from public.participants p
    where p.is_active = true
      and btrim(p.name) = btrim(input_actor_name)
      and regexp_replace(p.phone, '\D', '', 'g') = regexp_replace(input_actor_phone, '\D', '', 'g');

    if v_participant_id is null then
      raise exception '참여자를 확인할 수 없습니다.';
    end if;
    if v_participant_id <> v_meeting.applicant_participant_id then
      raise exception '본인 신청만 취소할 수 있습니다.';
    end if;

  -- admin이 취소하는 경우 유효한 관리자만 취소 가능
  elsif input_actor_type = 'admin' then
    select exists (
      select 1
      from public.admins a
      where a.is_active = true
        and btrim(a.name) = btrim(input_actor_name)
        and regexp_replace(a.phone, '\D', '', 'g') = regexp_replace(input_actor_phone, '\D', '', 'g')
    ) into v_admin_exists;

    if not v_admin_exists then
      raise exception '관리자 권한을 확인할 수 없습니다.';
    end if;
  else
    raise exception '취소 요청자 정보가 올바르지 않습니다.';
  end if;

  -- 이미 취소된 신청은 중복 취소되지 않게 처리
  if v_meeting.status = 'cancelled' then
    return query select v_meeting.meeting_id, v_meeting.status, 0;
    return;
  end if;

  update public.meetings
  set status = 'cancelled', updated_at = now()
  where meeting_id::text = input_meeting_id;

  update public.sessions
  set status = 'cancelled', updated_at = now()
  where meeting_id::text = input_meeting_id
    and status <> 'cancelled';

  get diagnostics v_cancelled_count = row_count;

  return query
  select input_meeting_id, 'cancelled'::text, v_cancelled_count;
end;
$$;

grant execute on function public.cancel_reservation_application(text, text, text, text) to anon, authenticated;
