# Manual SQL 운영 순서

이 폴더는 운영 오픈 또는 비상 대응 시 Supabase SQL Editor 또는 Supabase CLI에서 순서대로 실행하는 SQL을 모아둡니다.

비밀키, service role key, DB password는 SQL 파일에 넣지 않습니다.

## 파일

1. `01_upsert_participants.sql`
   - 피스메이커 참가자 26명을 최신 엑셀 기준으로 반영합니다.
   - Level 2 14명, Level 1 12명 기준입니다.

2. `02_upsert_admins.sql`
   - 관리자 10명을 최신 엑셀 기준으로 반영합니다.
   - 한필구 / 01033808374 계정을 포함합니다.

3. `03_clear_test_reservations.sql`
   - 운영 전 테스트 예약 이력을 삭제합니다.
   - `sessions`, `meetings`만 삭제합니다.

4. `04_verify_counts.sql`
   - 운영 DB count와 핵심 로그인 RPC를 확인합니다.
   - 기대값: active participants 26, active admins 10, meetings 0, sessions 0.

5. `05_emergency_reset.sql`
   - 비상 시 예약 이력만 즉시 초기화합니다.
   - 운영 master 데이터는 삭제하지 않습니다.

## 유지 대상

- participants
- admins
- spaces
- space_images
- operating_hours
- admin_blocks

## 삭제 대상

- meetings
- sessions

## CLI 실행 예시

```bash
SUPABASE_DISABLE_TELEMETRY=1 npm exec -- supabase db query --linked --file supabase/manual-sql/01_upsert_participants.sql
SUPABASE_DISABLE_TELEMETRY=1 npm exec -- supabase db query --linked --file supabase/manual-sql/02_upsert_admins.sql
SUPABASE_DISABLE_TELEMETRY=1 npm exec -- supabase db query --linked --file supabase/manual-sql/03_clear_test_reservations.sql
SUPABASE_DISABLE_TELEMETRY=1 npm exec -- supabase db query --linked --file supabase/manual-sql/04_verify_counts.sql
```

Supabase CLI의 linked DB query는 병렬 실행하지 않습니다. temp login role 초기화가 충돌할 수 있으므로 순차 실행합니다.
