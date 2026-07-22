# 지시서 ②: 공간 추가를 Supabase에 실제 저장 (계약 공간 관리)

## 1. 배경과 전제

- 관리자 화면의 "새 공간 추가" 폼(`SpaceCreateForm`)은 UI만 존재한다. `src/App.tsx` 517행 부근에서 로컬 state에만 추가하고 DB 저장이 없어 새로고침하면 사라진다. 이를 실제 Supabase insert로 연결한다.
- 기존 공간 수정 RPC `update_admin_space`(`supabase/migrations/20260626090000_update_admin_space.sql`)는 update 전용이며 category·sort_order·운영시간을 다루지 않는다. 신규 생성 RPC를 별도로 만든다.
- 계약 만료 공간 처리는 기존 `비활성 처리`(is_active)·`사용자 숨김`(is_public_visible) 토글로 이미 가능하므로 이 작업 범위가 아니다.
- 운영시간은 `public.operating_hours` 테이블에 공간별·요일별 행으로 저장된다 (`supabase/manual-sql/supabase_update_chitchat_operating_hours.sql` 참고). 신규 공간 생성 시 7개 요일 행을 함께 insert해야 참가자 화면 예약 슬롯이 생성된다.
- 전제: 지시서 ①(참가자 관리)이 먼저 완료되어 같은 RPC 작성 패턴이 저장소에 존재한다.
- 이 작업이 아닌 것: 공간 물리 삭제, 운영시간 요일별 커스텀 편집 UI(프리셋 4종만), 공간 사진 갤러리 업로드.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `supabase/migrations/20260626090000_update_admin_space.sql` — spaces 컬럼 구성, RPC 패턴, 반환 테이블 형태
- `supabase/manual-sql/supabase_update_chitchat_operating_hours.sql` — operating_hours 테이블 구조 단서
- `src/components/SpaceCreateForm.tsx` — 기존 폼 필드와 `onAddSpace` 콜백, 운영시간 프리셋 4종
- `src/components/SpaceAdminEditor.tsx` — 폼이 어디에 배치되는지
- `src/App.tsx` — `onAddSpace`(517행 부근)와 `handleSaveSpace`/`saveAdminSpace`(371행 부근) 연결 방식
- `src/lib/supabaseReservationApi.ts` — `saveAdminSpace`(519행 부근) 패턴
- `src/lib/supabaseMappers.ts` — space row + operating_hours row → `Space` 매핑 (200행 부근)
- `src/data/operatingHours.ts` — 프리셋 4종의 실제 값

## 3. 산출물

### 3-1. 마이그레이션 SQL (신규 1개, `supabase/migrations/`)

**`create_admin_space` RPC**
- 입력: `input_admin_name`, `input_admin_phone`, `input_space_id text`, `input_name`, `input_category text`, `input_capacity integer`, `input_description`, `input_image_url`, `input_features text[]`, `input_is_active boolean`, `input_is_public_visible boolean`, `input_requires_admin_unlock boolean`, `input_parent_space_name`, `input_admin_memo`, `input_sort_order integer`, `input_operating_hours jsonb`
- `input_operating_hours`는 `[{"day_of_week":0,"open_time":"09:00","close_time":"21:00","is_closed":false}, ...]` 형태 7개 요소. 7개가 아니거나 파싱 실패 시 예외.
- 검증: `is_valid_admin` 필수. 공간명 공백 불가. capacity ≥ 1. category는 `'youth-building'` 또는 `'lifestyle'`만 허용. `input_space_id`가 이미 존재하면 `'이미 존재하는 공간입니다.'` 예외.
- spaces insert 후 operating_hours 7행 insert를 같은 함수 안에서 수행 (트랜잭션 보장).
- returns table은 `update_admin_space`와 동일한 컬럼 구성.
- grant execute to anon, authenticated.

### 3-2. 프론트 API (`src/lib/supabaseReservationApi.ts`)

- `createAdminSpace(credentials, input)` 추가. `saveAdminSpace` 패턴 복제. `Space` 객체의 `operatingHours`를 jsonb 배열 형태로 변환해 전달. 성공 시 매핑된 `Space` 반환.

### 3-3. 배선 (`src/App.tsx` + `src/components/SpaceCreateForm.tsx`)

- `onAddSpace`를 async로 바꿔 `createAdminSpace` 호출 → 성공 시 `fetchAdminReadModel` 재조회(또는 반환된 Space를 adminSpaces에 반영 + 재조회, 기존 `handleSaveSpace` 방식과 동일하게) → 실패 시 폼에 한국어 오류 메시지 표시.
- 폼에 저장 중 상태(버튼 비활성 + "저장 중") 추가. 성공 시에만 폼 초기화.
- space_id는 폼에서 생성하되 기존 `space-${Date.now()}` 방식을 유지한다.
- 목업 폴백 모드(`canUseMockFallback`)에서는 기존 로컬 state 추가 동작을 유지한다.

### 3-4. 문서

- `ADMIN_GUIDE.md`의 공간 관리 절에 "새 공간 추가" 사용법 추가 (프리셋 4종 설명 포함, 기존 문체 유지).

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- 기존 마이그레이션 파일 수정 금지 (신규 파일만).
- `update_admin_space` RPC 동작 변경 금지.
- `dist/`, `node_modules/`, `.env.local` 접근 금지.
- 실제 Supabase DB 적용 시도 금지 (파일 작성까지만).

## 5. 완료 기준

1. `npx tsc --noEmit` 통과.
2. `npm run build` 통과.
3. `npx eslint src` 통과 (워닝 증가 없음).
4. 신규 마이그레이션에 `is_valid_admin`, `grant execute`, operating_hours insert가 존재하는지 grep 확인.
5. `grep -n "onAddSpace" src/App.tsx` 결과가 로컬 state 단독 추가가 아니라 API 호출 경로임을 확인.
6. DB 실동작은 "미검증: DB 적용 후 확인 필요"로 보고에 명시.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
