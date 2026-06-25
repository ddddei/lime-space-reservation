-- ⚠️ 이 SQL을 Supabase SQL Editor에 먼저 실행해야 합니다.
--
-- 모임공간 칫챗(chitchat)의 최종 운영시간은 08:00~22:00입니다.
-- 기존에 06:00~22:00으로 등록된 운영시간 행이 있다면 08:00으로 보정합니다.
--
-- 실행 전 확인:
--   select * from public.operating_hours where space_id::text = 'chitchat';
-- 위 조회 결과의 space_id 값이 'chitchat'이 아니라면 아래 where 절의 값을 실제 space_id로 바꿔주세요.

update public.operating_hours
set open_time = '08:00'
where space_id::text = 'chitchat'
  and open_time = '06:00';

-- 변경 확인
-- select space_id, day_of_week, open_time, close_time, is_closed
-- from public.operating_hours
-- where space_id::text = 'chitchat'
-- order by day_of_week;
