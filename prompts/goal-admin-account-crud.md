# 지시서 ⑦: 관리자 계정 추가/비활성 관리 (참가자 관리와 동일 UX)

## 1. 배경과 전제

- 참가자는 지시서 ①로 관리자 화면에서 추가/비활성이 가능해졌지만, 관리자 계정 10명은 여전히 `supabase/manual-sql/02_upsert_admins.sql`을 직접 실행해야만 추가/제외할 수 있다. 참가자 관리와 같은 방식으로 화면에서 관리할 수 있게 한다.
- 관리자 인증은 `verify_admin`(이름+전화)이고, 모든 관리자 RPC가 `is_valid_admin`으로 권한을 확인한다. admins 테이블 컬럼은 `02_upsert_admins.sql`에서 확인한다.
- **잠금 방지 필수**: 마지막 활성 관리자를 비활성화하면 아무도 로그인 못 하게 된다. RPC에서 활성 관리자가 1명뿐이면 비활성화를 거부한다. 또한 자기 자신 비활성화도 거부한다(실수 방지).
- 이 작업이 아닌 것: 관리자 권한 등급(role 세분화), 비밀번호 방식 변경.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `supabase/manual-sql/02_upsert_admins.sql` — admins 테이블 컬럼 전체와 관례
- `supabase/migrations/20260722100000_create_admin_participant.sql`, `20260722100500_deactivate_admin_participant.sql` — 그대로 따를 패턴 (중복 판정, 재활성화, 예외 메시지)
- `src/components/AdminUserChecklist.tsx` — 지시서 ①에서 넣은 추가 폼·비활성/재활성 버튼·토글 UI (재사용 소스)
- `src/components/AdminPage.tsx`, `src/App.tsx` — 참가자 관리 배선 방식
- `src/lib/supabaseReservationApi.ts` — `createAdminParticipant`/`deactivateAdminParticipant` 패턴, `fetchAdminReadModel`
- `src/types/reservation.ts` — `Admin` 타입

## 3. 산출물

### 3-1. 마이그레이션 SQL (신규 2개, `supabase/migrations/`)

**`create_admin_account` RPC** — `create_admin_participant` 패턴 준수:
- 입력: `input_admin_name`, `input_admin_phone`(요청자), `input_name`, `input_phone`, `input_role text default null`, `input_memo`가 아니라 admins 컬럼 구성에 맞춘 필드 (02 SQL 확인 후 결정, role 기본값은 기존 데이터에서 가장 흔한 값).
- 이름+전화(숫자만) 중복 판정: 비활성이면 재활성화, 활성이면 `'이미 등록된 관리자입니다.'` 예외. admin_id 생성 규칙은 02 SQL의 기존 id 관례를 따른다.
- returns table + grant (기존 패턴).

**`deactivate_admin_account` RPC**:
- 입력: 요청자 이름/전화 + `input_admin_id`.
- `is_valid_admin` 검증 → 대상 미존재 예외 → **요청자 본인이면 `'본인 계정은 비활성화할 수 없습니다.'` 예외** → **활성 관리자가 1명뿐이면 `'최소 1명의 활성 관리자가 필요합니다.'` 예외** → is_active=false.
- returns table + grant.

### 3-2. 프론트 (`src/lib/supabaseReservationApi.ts` + UI)

- `createAdminAccount`/`deactivateAdminAccount` 함수 + `supabaseClient.ts` 타입 등록 (참가자 패턴 복제).
- `fetchAdminReadModel`이 관리자 목록을 아직 안 가져오면: `get_admin_accounts` 성격의 조회가 이미 있는지 먼저 확인하고, 없으면 조회 RPC도 신규 마이그레이션에 포함한다 (`get_admin_participants` 패턴, 비활성 포함 반환).
- 관리자 페이지에 **"관리자 계정" 섹션 신설**: 참가자 체크리스트와 같은 UX(목록, 추가 접이식 폼, 비활성/재활성 버튼, 비활성 포함 보기 토글). ①의 UI에서 재사용 가능한 부분은 공용 컴포넌트로 추출 검토하되, 무리한 추상화보다는 명료함 우선.
- 전화번호는 참가자와 동일하게 마스킹 관례(`src/lib/masking.ts` 확인)를 따라 표시.
- 본인 행에는 비활성 버튼을 비활성화(disabled)하고 "본인" 배지 표시.

### 3-3. 문서

- `ADMIN_GUIDE.md`에 "관리자 계정 관리" 절 추가 (잠금 방지 규칙 설명 포함).
- `supabase/manual-sql/README.md`의 02번 안내에 "일상 추가/제외는 관리자 화면에서" 한 줄 추가.

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- 기존 마이그레이션·RPC 파일 수정 금지 (신규 파일만).
- admins에 대한 delete 문 금지 (논리 삭제만).
- 실제 Supabase DB 적용 시도 금지.
- `dist/`, `node_modules/`, `.env.local` 접근 금지.

## 5. 완료 기준

1. `npx tsc --noEmit` 통과. 2. `npm run build` 통과. 3. `npx eslint src` 통과 (워닝 증가 없음).
4. `grep -c "delete from public.admins" supabase/migrations/*.sql` 전체 0건.
5. 신규 deactivate RPC에 본인 차단·최소 1명 보장 로직이 존재하는지 grep/육안 확인.
6. 코드 트레이스: ① 본인 행 버튼 disabled 경로 ② 마지막 1명 비활성 시도 시 예외 메시지 노출 경로 ③ 재활성 경로 ④ 추가 성공 시 목록 재조회 경로. 실 DB 동작은 "미검증: DB 적용 후 확인 필요"로 명시.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, 코드 트레이스 4건, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
