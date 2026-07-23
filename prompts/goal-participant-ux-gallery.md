# 지시서 ⑧: 참여자 UX 3종 — 달력 오늘 시작 · 남은 사용시간 강조 · 공간 사진 여러 장

## 1. 배경과 전제

세 가지 참여자 편의 개선을 한 브랜치에서 진행한다:

- **(A) 달력 오늘 시작**: 달력이 `"2026-07-01"` 고정 기준(`getCalendarDates` 기본값, `App.tsx`의 `selectedDate` 초기값)이라 운영이 길어질수록 지난 날짜가 앞에 깔린다. 오늘(KST) 기준으로 시작하게 한다.
- **(B) 남은 사용시간 강조**: 레벨별 한도 대비 남은 시간이 예약 화면에서 눈에 잘 안 띈다. `buildEligibility`가 이미 `usedBlocks`/`remainingBlocks`를 계산하므로 표시만 강화하면 된다.
- **(C) 공간 사진 여러 장**: `space_images` 테이블·타입·조회(`fetchSpaceImageRows`)·참가자 화면 갤러리 표시는 이미 있으나 **사진을 등록할 관리 UI와 mutation RPC가 없어 죽어있는 기능**이다. 관리자 화면에서 공간별로 사진 여러 장을 추가/제거/대표 지정할 수 있게 한다. 파일 업로드는 ④⑤의 `uploadSpaceImage`(space-images 버킷)를 재사용한다.

이 작업이 아닌 것: 사진 순서 드래그 정렬(대표 지정+등록순이면 충분), 참가자 갤러리 UI 리디자인(기존 팝업 유지), 예약 화면 구조 변경.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `src/lib/date.ts` — `getCalendarDates(baseDate, days)`, `formatDateValue`
- `src/App.tsx` — `selectedDate` 초기값(74행 부근), `buildEligibility` 사용부(562행 부근), CalendarView 연결
- `src/components/CalendarView.tsx` — 달력 렌더링과 baseDate 사용 방식
- `src/components/EligibilityPanel.tsx`, `src/components/UserReservationFlow.tsx` — 남은 시간이 현재 어떻게 표시되는지
- `src/lib/mockReservationActions.ts` — `buildEligibility` 반환 구조
- `src/types/reservation.ts` — `SpaceImage` 타입
- `src/lib/supabaseMappers.ts` — `SpaceImageRow` (space_images 컬럼 구성의 근거)
- `src/lib/supabaseReservationApi.ts` — `fetchSpaceImageRows`(247행 부근), 기존 mutation 패턴
- `src/components/SpaceDetail.tsx`, `src/components/SpaceCard.tsx` — 참가자 갤러리 표시 방식
- `src/components/SpaceAdminEditor.tsx`, `src/components/SpaceImageUploadField.tsx` — ⑤의 업로드 부품
- `supabase/migrations/20260722100000_create_admin_participant.sql` — RPC 패턴

## 3. 산출물

### 3-A. 달력 오늘 시작

- `App.tsx`의 `selectedDate` 초기값과 달력 기준일을 오늘(KST, `Asia/Seoul` 기준 날짜 문자열)로. 기존 `formatDateValue`/`getCalendarDates` 재사용, 62일 창 유지.
- 오늘이 휴무이거나 지난 시간대만 남은 경우에도 달력 선택 자체는 기존 로직에 맡긴다 (슬롯이 없으면 기존처럼 빈 슬롯 안내).
- 하드코딩된 `"2026-07-01"` 리터럴이 소스에서 사라져야 한다 (mock 데이터 파일은 예외).

### 3-B. 남은 사용시간 강조

- 참가자 예약 화면 상단(공간 목록/예약 진입부에서 항상 보이는 위치)에 "이번 시즌 남은 시간 X시간 / 전체 Y시간" 배지를 추가. `remainingBlocks/2` 시간 표기, 잔여 0이면 경고색.
- 기존 `EligibilityPanel`의 상세 정보는 유지 (중복 표기여도 무방 — 배지는 요약, 패널은 상세).

### 3-C. 공간 사진 여러 장

**마이그레이션 신규 1개** (`supabase/migrations/`):
- `add_space_image` RPC: 관리자 검증(`is_valid_admin`) + 공간 존재 확인 + image_url 필수. `space_images`에 insert (sort_order는 해당 공간 최대+1, 첫 사진이면 `is_primary = true`). image_id 생성 규칙은 SpaceImageRow의 기존 id 형태를 근거로 정한다 (근거 없으면 `img-<타임스탬프>` 류 텍스트).
- `remove_space_image` RPC: `is_active = false` 논리 삭제. 대표 사진을 제거하면 남은 활성 사진 중 sort_order 최소를 대표로 승격.
- `set_primary_space_image` RPC: 대상만 `is_primary = true`, 같은 공간의 나머지는 false.
- 모두 returns table + grant, 예외 메시지 한국어, 기존 패턴 준수. `delete` 문 금지(논리 삭제만).

**프론트**:
- API 3개 함수 + `supabaseClient.ts` 타입 등록 (기존 패턴).
- `SpaceAdminEditor` 수정 폼에 "사진 갤러리" 절 추가: 현재 활성 사진 썸네일 목록(대표 표시), 파일 선택→업로드→`add_space_image` 호출, 각 썸네일에 "대표 지정"/"제거" 버튼. 저장 중/오류 처리 기존 관례.
- 참가자 화면: 기존 갤러리 표시 로직이 `space.images`를 쓰는지 확인하고, 관리자 쪽 변경 후 재조회(`fetchAdminReadModel`·`fetchReservationReadModel`)로 반영되는지 배선 확인. 표시 자체의 리디자인은 하지 않는다.
- 목업 폴백 모드에서는 갤러리 관리 기능 숨김.

### 3-D. 문서

- `ADMIN_GUIDE.md`에 사진 갤러리 관리 방법 추가. `USER_GUIDE.md`에 남은 시간 배지 안내 한 줄.

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- 기존 마이그레이션·RPC 파일 수정 금지 (신규 파일만). `space_images` 물리 delete 금지.
- 실제 Supabase DB 적용·Storage 업로드 시도 금지.
- `dist/`, `node_modules/`, `.env.local` 접근 금지.
- mock 데이터 파일의 날짜/이미지 값 대량 변경 금지 (폴백 동작 유지에 필요한 최소 수정만).

## 5. 완료 기준

1. `npx tsc --noEmit` 통과. 2. `npm run build` 통과. 3. `npx eslint src` 통과 (워닝 증가 없음).
4. `grep -rn '"2026-07-01"' src --include="*.tsx" --include="*.ts" | grep -v "src/data/"` 결과 0건.
5. 신규 마이그레이션에 `is_valid_admin`·`grant execute` 존재, `delete from public.space_images` 0건.
6. `npm run dev`로 수동 확인(확인 후 서버 종료): ① 달력 첫 날짜가 오늘 ② 남은 시간 배지 표시 ③ 관리자 갤러리 UI 렌더링(업로드는 코드 트레이스로 대체 — "미검증: DB 적용 후 확인 필요" 명시) ④ 대표 제거 시 승격 로직 코드 트레이스.

**보고에 포함할 것**: 변경/추가 파일 목록, 검증 명령별 결과, 수동 확인·코드 트레이스 결과, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
