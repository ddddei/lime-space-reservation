-- 2026-07-23 실DB(pg_get_functiondef)에서 덤프한 현행 정의. 저장소에 원본 마이그레이션이 없어 기준용으로 보관.
-- 이 파일을 실행하지 말 것 — 수정은 새 마이그레이션에서 create or replace로 진행한다.

CREATE OR REPLACE FUNCTION public.get_admin_participants(input_admin_name text, input_admin_phone text)
 RETURNS TABLE(participant_id text, name text, phone text, phone_last4 text, level integer, has_plan boolean, has_budget boolean, has_promotion boolean, has_admin_approval boolean, max_blocks integer, memo text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
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
    p.updated_at
  from public.participants p
  where public.is_valid_admin(input_admin_name, input_admin_phone)
  order by p.is_active desc, p.level desc, p.name asc;
$function$
