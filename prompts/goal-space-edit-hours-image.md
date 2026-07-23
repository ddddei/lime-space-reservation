# 지시서 ⑤: 기존 공간의 운영시간·사진을 관리자 화면에서 수정

## 1. 배경과 전제

- 지시서 ④로 **새 공간**은 사진 파일 업로드와 운영시간 직접 설정이 가능해졌지만, **기존 공간**은 여전히 둘 다 수정할 수 없다. 운영시간을 바꾸려면 SQL을 직접 실행해야 하는 상태다(`supabase/manual-sql/supabase_update_chitchat_operating_hours.sql`이 그 흔적).
- 기존 공간 수정 RPC `update_admin_space`는 운영시간을 다루지 않는다. **운영시간 갱신용 신규 RPC 1개**를 추가한다 (기존 RPC는 수정 금지 — 신규 파일만).
- 사진은 `update_admin_space`가 이미 `image_url`을 갱신하므로 DB 변경 불필요 — 수정 폼에 ④에서 만든 업로드 부품(`uploadSpaceImage`)을 붙여 URL을 채워주기만 하면 된다.
- 이 작업이 아닌 것: `space_images` 갤러리 다중 사진 관리, 신규 공간 폼 변경(④에서 완료), 카테고리·sort_order 수정.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `src/components/SpaceAdminEditor.tsx` — 기존 공간 수정 폼의 draft/저장 패턴 전체
- `src/components/SpaceCreateForm.tsx` — ④에서 넣은 파일 업로드 UI·직접 설정 UI (재사용 소스)
- `src/lib/spaceImageUpload.ts` — `uploadSpaceImage` 시그니처
- `src/lib/supabaseReservationApi.ts` — `saveAdminSpace`, `createAdminSpace`의 `toOperatingHoursPayload` 패턴
- `supabase/migrations/20260722101000_create_admin_space.sql` — 운영시간 jsonb 검증·insert 패턴 (신규 RPC가 따를 기준)
- `supabase/migrations/20260626090000_update_admin_space.sql` — 기존 update RPC (수정 금지, 반환 형태 참고)
- `src/data/operatingHours.ts`, `src/lib/date.ts`, `src/types/reservation.ts`

## 3. 산출물

### 3-1. 마이그레이션 SQL (신규 1개, `supabase/migrations/`)

**`update_admin_space_operating_hours` RPC**
- 입력: `input_admin_name`, `input_admin_phone`, `input_space_id text`, `input_operating_hours jsonb`
- 검증: `is_valid_admin` 필수. 공간 미존재 시 `'공간 정보를 찾을 수 없습니다.'` 예외. jsonb는 `create_admin_space`와 동일하게 7개 요소·형식 검증.
- 처리: 해당 공간의 `public.operating_hours` 행을 **delete 후 7행 insert** (같은 함수 안, 트랜잭션 보장). spaces의 `updated_at`도 갱신.
- returns table로 갱신된 운영시간 7행(`space_id, day_of_week, open_time, close_time, is_closed`) 반환. grant execute to anon, authenticated.
- 주의: 여기서의 delete는 운영시간 행 교체이며 금지 대상(참가자/예약 데이터 물리 삭제)이 아니다.

### 3-2. 프론트 API (`src/lib/supabaseReservationApi.ts`)

- `updateAdminSpaceOperatingHours(credentials, spaceId, operatingHours)` 추가. 기존 패턴 복제, 성공 시 매핑된 `OperatingHour[]` 반환. `supabaseClient.ts` RPC 타입 등록 포함.

### 3-3. UI (`src/components/SpaceAdminEditor.tsx` + `src/App.tsx`)

- **사진**: 수정 폼의 사진 URL 입력 옆에 파일 선택 추가 (④와 동일 UX: 미리보기, 선택 취소, 저장 시점 업로드, 실패 시 저장 중단+한국어 메시지). 업로드 성공 시 draft의 `imageUrl`을 교체해 기존 `onSaveSpace` 경로로 저장.
- **운영시간**: 수정 폼에 현재 운영시간을 요약 표시(예: "매일 09:00~21:00" / 요일별이면 줄별)하고 "운영시간 수정" 토글로 ④의 직접 설정 UI(시작/종료 select + 휴무 요일 체크)를 노출. 폼을 열 때 기존 운영시간 값으로 초기화한다 — 공통 시간+휴무 형태로 환원 불가능한 데이터(요일마다 다른 시간, 예: 티파티)면 가장 흔한 시간대로 초기화하고 "요일별 상세 시간은 저장 시 공통 시간으로 통일됩니다" 경고를 표시한다.
- 운영시간 저장은 공간 정보 저장과 **별도 버튼**으로 분리한다 (RPC가 다르므로 실패 지점을 분리해 혼란 방지). 저장 성공 시 관리자·참가자 읽기 모델 재조회.
- ④ UI 부품 중 재사용 가능한 것은 컴포넌트로 추출해 두 폼이 공유한다 (복붙 금지). 추출 위치는 `src/components/` 신규 파일.

### 3-4. 문서

- `ADMIN_GUIDE.md` 공간 관리 절에 기존 공간 사진 교체·운영시간 수정 방법 추가.
- `supabase/manual-sql/README.md`의 운영시간 수동 SQL 안내에 "이제 관리자 화면에서 가능" 한 줄 추가.

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- 기존 마이그레이션 파일·`update_admin_space` RPC 수정 금지 (신규 파일만).
- participants/meetings/sessions에 대한 delete 문 금지 (operating_hours 교체 delete만 허용).
- 실제 Supabase DB 적용·Storage 업로드 시도 금지 (파일 작성까지만).
- `dist/`, `node_modules/`, `.env.local` 접근 금지.

## 5. 완료 기준

1. `npx tsc --noEmit` 통과. 2. `npm run build` 통과. 3. `npx eslint src` 통과 (워닝 증가 없음).
4. 신규 마이그레이션에 `is_valid_admin`·`grant execute`·7개 요소 검증이 존재하는지 grep 확인.
5. `grep -rn "uploadSpaceImage" src/components/` 결과에 SpaceAdminEditor(또는 추출된 공용 컴포넌트) 포함 확인.
6. 코드 트레이스: ① 파일 없이 저장 시 기존 흐름 불변 ② 운영시간 수정 없이 공간 정보만 저장 시 운영시간 RPC 미호출 ③ 티파티(요일별 상이) 공간을 열었을 때 경고 노출 경로 ④ 저장 후 재조회 경로. 실 DB 동작은 "미검증: DB 적용 후 확인 필요"로 명시.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, 코드 트레이스 4건, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
