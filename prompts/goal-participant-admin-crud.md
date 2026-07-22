# 지시서 ①: 관리자 화면에서 참가자(피스메이커) 추가/비활성 관리

## 1. 배경과 전제

- 현재 참가자 명단 추가/제외는 `supabase/manual-sql/01_upsert_participants.sql`을 DB 콘솔에서 직접 실행해야만 가능하다. 운영자가 관리자 화면에서 직접 인원을 추가하고 제외할 수 있게 만든다.
- 이미 되어 있는 것: 관리자 화면 `참여자 체크리스트`(AdminUserChecklist)에서 예약 승인 토글(`update_participant_reservation_approval` RPC), Level 변경(`update_participant_level` RPC)이 동작한다. 새 기능은 이 두 기능의 패턴(마이그레이션 SQL + supabaseReservationApi 함수 + App.tsx 핸들러 + 컴포넌트 UI)을 그대로 따른다.
- **"삭제"는 물리 삭제가 아니라 `is_active = false` 비활성 처리다.** 참가자는 예약 데이터(meetings/sessions)와 연결되어 있어 물리 삭제하면 신청 이력이 깨진다. 비활성 참가자는 로그인(`verify_participant`)이 이미 막혀 있는지 확인하고, 막혀 있지 않다면 이 작업 범위에서 막는다.
- 이 작업이 아닌 것: 공간 추가(지시서 ②), 시간 단위 변경(지시서 ③), 관리자(admins) 계정 관리.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `supabase/manual-sql/01_upsert_participants.sql` — participants 테이블 컬럼 전체와 participant_id 규칙(`pm-<전화번호 숫자만>`), 중복 판정 규칙(이름 btrim + 전화 숫자만 일치)
- `supabase/migrations/20260626120000_update_participant_level.sql` — RPC 작성 패턴(관리자 검증 `is_valid_admin`, 예외 메시지 한국어, returns table, grant)
- `supabase/migrations/20260625172500_update_participant_reservation_approval.sql` — 같은 패턴 참고
- `src/lib/supabaseReservationApi.ts` — `updateParticipantLevel`(431행 부근) 함수 패턴, `fetchAdminReadModel`의 `get_admin_participants` 호출
- `src/lib/supabaseMappers.ts` — participant row → `ParticipantUser` 매핑
- `src/components/AdminUserChecklist.tsx` — 기존 테이블 UI, savingIds/errorsById 패턴
- `src/App.tsx` — `handleToggleApproval`/레벨 변경 핸들러가 어떻게 `fetchAdminReadModel` 재조회와 연결되는지
- `src/data/settings.ts` — `LEVEL_MAX_BLOCKS` (Level 1 → 16블록, Level 2 → 48블록)

## 3. 산출물

### 3-1. 마이그레이션 SQL (신규 2개, `supabase/migrations/`)

파일명은 기존 관례(`YYYYMMDDHHMMSS_이름.sql`)를 따르고 타임스탬프는 오늘 날짜 기준으로 기존 파일보다 뒤에 오게 한다.

**`create_admin_participant` RPC**
- 입력: `input_admin_name`, `input_admin_phone`, `input_name`, `input_phone`, `input_level integer`, `input_memo text`
- 검증: `is_valid_admin` 통과 필수. 이름 공백 불가. 전화번호는 숫자만 추출해 10~11자리가 아니면 예외. level은 1 또는 2만 허용.
- participant_id는 `'pm-' || 전화번호숫자만` 으로 생성한다 (기존 관례).
- 중복 판정: 이름(btrim) + 전화 숫자만 일치하는 행이 이미 있으면 — 그 행이 비활성이면 재활성화(is_active=true, level/max_blocks 갱신)하고, 활성이면 `'이미 등록된 참가자입니다.'` 예외.
- max_blocks는 level 1이면 16, level 2면 48. has_plan/has_budget/has_promotion/has_admin_approval 기본값은 **모두 false** (신규 인원은 승인 대기 상태로 시작해야 운영 흐름과 맞다).
- phone_last4는 전화 숫자 끝 4자리. phone은 입력값 그대로 저장하되 btrim.
- returns table로 생성/갱신된 참가자 행 전체 반환 (get_admin_participants가 반환하는 컬럼 구성과 동일하게).
- grant execute to anon, authenticated.

**`deactivate_admin_participant` RPC**
- 입력: `input_admin_name`, `input_admin_phone`, `input_participant_id`
- 검증: `is_valid_admin` 통과 필수. 대상 없으면 `'참가자를 찾을 수 없습니다.'` 예외.
- `is_active = false, updated_at = now()` 처리, memo에 비활성 사유를 덧붙이지는 않는다(운영자가 메모를 직접 관리).
- returns table로 갱신된 행 반환. grant 동일.

### 3-2. 프론트 API (`src/lib/supabaseReservationApi.ts`)

- `createAdminParticipant(credentials, input)` / `deactivateAdminParticipant(credentials, participantId)` 함수 추가. 기존 `updateParticipantLevel` 함수의 시그니처·에러 처리(성공 시 매핑된 `ParticipantUser` 또는 boolean, 실패 시 undefined/false + 콘솔이 아닌 기존 방식 그대로) 패턴을 복제한다.

### 3-3. UI (`src/components/AdminUserChecklist.tsx` + `src/App.tsx`)

- 체크리스트 상단에 **"참가자 추가" 접이식 폼**: 이름, 전화번호(010-0000-0000 형식 안내), Level 선택(1/2), 메모(선택). 저장 중 비활성화, 실패 시 한국어 오류 메시지 표시. 성공 시 폼 초기화 + 목록 갱신.
- 각 행에 **"비활성" 버튼** 추가. 누르면 `confirm` 등 1단계 확인 후 실행. `readOnly` 모드(목업 폴백)에서는 숨김.
- **"비활성 포함 보기" 토글** 추가: 기본은 활성 참가자만 표시. `get_admin_participants`가 비활성 참가자를 반환하는지 먼저 확인하고, 반환하지 않으면 반환하도록 마이그레이션에 포함하되 기존 화면(활성만 기본 표시)이 달라지지 않게 프론트에서 필터한다. 비활성 행은 회색 처리 + "재활성" 버튼(= create RPC의 재활성 경로 또는 별도 reactivate 경로, 구현 단순한 쪽 선택).
- App.tsx에서 성공 시 `fetchAdminReadModel` 재조회로 목록을 갱신한다 (기존 승인 토글과 동일한 갱신 방식).

### 3-4. 문서

- `ADMIN_GUIDE.md`에 "참가자 추가/비활성" 절 추가 (운영자 눈높이, 기존 문체 유지).
- `supabase/manual-sql/README.md`에 "일상적인 인원 추가/제외는 이제 관리자 화면에서 가능, 대량 반영 시에만 01번 SQL 사용" 안내 1~2줄 추가.

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지 (검수자가 수행).
- 새 npm 의존성 추가 금지.
- 기존 RPC·마이그레이션 파일 수정 금지 (신규 파일만). 단, `get_admin_participants`가 비활성을 반환하지 않아 수정이 불가피하면 **새 마이그레이션 파일에서 create or replace**로 처리하고 보고에 명시한다.
- `dist/`, `node_modules/`, `.env.local` 접근 금지.
- 물리 delete 문 작성 금지.
- 실제 Supabase DB에 SQL을 적용하려 시도하지 않는다 (파일 작성까지만; 적용은 검수자가 별도 수행).

## 5. 완료 기준

에이전트가 스스로 아래를 실행·확인한다:

1. `npx tsc --noEmit` 통과 (tsconfig.app.json 기준 빌드는 `npm run build`로 대체 가능).
2. `npm run build` 통과.
3. `npx eslint src` 통과 (기존 워닝 수 대비 증가 없음).
4. `grep -c "delete from public.participants" supabase/migrations/*.sql` 결과 0건.
5. 신규 마이그레이션 2개 파일에 `is_valid_admin` 호출과 `grant execute`가 각각 존재하는지 grep으로 확인.
6. 개발 서버 없이 확인 불가한 실동작(DB 연동)은 "미검증: DB 적용 후 확인 필요"로 보고에 명시한다.

**보고에 포함할 것**: 변경/추가 파일 목록, 위 검증 명령별 결과, 판단이 필요했던 지점과 선택한 근거, 보류 항목, `git status --short` 출력.
