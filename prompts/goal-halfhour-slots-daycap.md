# 지시서 ③: 예약 시간 30분 단위 선택 + 24시간 공간 09~22시 제한

## 1. 배경과 전제

- 내부 데이터 모델은 이미 30분 블록이다(`BLOCK_MINUTES = 30`, 세션의 blockCount 등). 그러나 참가자 화면의 `TimeBlockSelector`가 30분 블록 2개를 1시간 슬롯으로 묶어 보여준다(`getHourlySlots`, `toggleHourSlot`). 이 묶음을 풀어 30분 단위 버튼으로 되돌린다. `src/lib/timeSelection.ts`에 30분 단위용 `toggleBlockTime`이 이미 존재하므로 재사용한다.
- 24시간 운영 공간(운영시간 00:00~24:00)은 새벽 이용이 거의 없어, 예약 가능 시간대를 **09:00~22:00**로만 연다. DB의 operating_hours는 바꾸지 않고 프론트에서 슬롯 생성·검증 시 클램프한다 (운영 정책이 다시 바뀔 때 되돌리기 쉽게).
- 프론트 전용 작업이다. 마이그레이션·RPC 변경 없음.
- 이 작업이 아닌 것: 하루 최대 선택량 변경(4시간 = 8블록 유지), 운영시간 데이터 수정, 관리자 차단 일정 로직 변경.

## 2. 작업 전 필독 파일 (읽지 않고 쓰지 마라)

- `src/components/TimeBlockSelector.tsx` — 현재 1시간 슬롯 UI 전체 (`getHourlySlots`, `toggleHourSlot` 사용부)
- `src/lib/timeSelection.ts` — `toggleBlockTime`(30분 단위, 이미 존재), `toggleHourSlot`, `getSelectedTimeRange`
- `src/lib/reservationRules.ts` — `getTimeSlots`(214행 부근, 슬롯 생성), `isWithinOperatingHours`(255행 부근, 저장 시 검증) — **두 곳 모두** 클램프를 적용해야 UI와 검증이 어긋나지 않는다
- `src/lib/date.ts` — `getTimeRangeBetween`, `toMinutes`
- `src/data/operatingHours.ts` — `allDayHours`가 00:00~24:00임을 확인
- `src/App.tsx` — 초기 `selectedBlockTimes` 값(65행 부근)과 TimeBlockSelector 연결부
- `src/components/UserReservationFlow.tsx` — 선택 시간 표시/안내 문구에 "1시간" 표현이 있는지

## 3. 산출물

### 3-1. 30분 단위 선택 UI (`src/components/TimeBlockSelector.tsx`)

- `getHourlySlots` 묶음 로직을 제거하고 30분 슬롯을 그대로 렌더링, 클릭 시 `toggleBlockTime` 사용.
- 버튼 라벨: 시작 시각(예: `10:30`)을 크게, 상태 라벨은 기존 스타일 유지. 30분 단위가 되면 버튼 수가 2배가 되므로 그리드 열 수를 조정해 모바일에서 세로로 과도하게 길어지지 않게 한다(기존 반응형 클래스 관례 안에서).
- 사용되지 않게 된 `toggleHourSlot`/`getHourBlockTimes`/`getHourlySlots`는 제거한다 (다른 참조가 없는지 grep으로 확인 후).
- 안내 문구 중 "1시간 슬롯" 표현을 30분 단위 기준으로 수정 (`timeSelection.ts`의 메시지 포함).

### 3-2. 24시간 공간 09~22시 클램프 (`src/lib/reservationRules.ts`)

- 클램프 규칙: **openTime이 00:00이고 closeTime이 24:00인 요일에만** open을 09:00, close를 22:00으로 치환한다. 일반 공간(예: 티파티 10:00~19:00)은 건드리지 않는다.
- 상수는 `src/data/settings.ts`에 `ALL_DAY_BOOKING_OPEN_TIME = "09:00"`, `ALL_DAY_BOOKING_CLOSE_TIME = "22:00"` 같은 이름으로 추가하고 하드코딩하지 않는다.
- 적용 지점: `getTimeSlots`(슬롯 생성)와 `isWithinOperatingHours`(저장 검증) **둘 다**. 헬퍼 함수 하나로 뽑아 두 곳에서 공유한다.
- 참가자 화면의 운영시간 안내 표시(공간 카드/상세에 운영시간이 노출된다면)는 실제 운영시간(24시간)을 유지하되, 예약 화면에는 "예약은 09:00~22:00까지 가능" 안내가 자연스럽게 보이도록 한다. 노출 위치는 기존 UI 관례를 따른다.

### 3-3. 초기 선택값 점검 (`src/App.tsx`)

- 초기 `selectedBlockTimes`(`["10:00", "10:30"]`)가 30분 단위 UI에서 자연스러운지 확인하고, 어색하면 1블록(`["10:00"]`)으로 조정한다. `DEFAULT_RESERVATION_BLOCKS`와의 일관성을 확인한다.

### 3-4. 문서

- `USER_GUIDE.md`·`FAQ.md`에서 시간 선택 관련 표현을 30분 단위 기준으로 수정하고, 24시간 공간의 예약 가능 시간(09~22시) 안내를 추가한다.

## 4. 금지 사항

- git 커밋/스테이징/브랜치 변경 금지. 새 npm 의존성 금지.
- `supabase/` 아래 파일 수정 금지 (프론트 전용 작업).
- 하루 최대 블록(`MAX_DAILY_BLOCKS = 8`), 세션 최대 수, 레벨별 한도 변경 금지.
- 관리자 차단 일정(AdminBlockForm) 동작 변경 금지.
- `dist/`, `node_modules/`, `.env.local` 접근 금지.

## 5. 완료 기준

1. `npx tsc --noEmit` 통과.
2. `npm run build` 통과.
3. `npx eslint src` 통과 (워닝 증가 없음).
4. `grep -rn "toggleHourSlot\|getHourlySlots" src` 결과 0건.
5. `grep -rn "22:00" src/lib/reservationRules.ts src/data/settings.ts` 로 클램프 상수 적용 확인 (reservationRules에는 상수 참조만, 리터럴 없음).
6. 수동 시나리오를 `npm run dev`로 직접 확인: ① 24시간 공간 선택 시 첫 슬롯 09:00·마지막 슬롯 21:30 ② 일반 공간(티파티 일요일 10:00~19:00)은 기존과 동일 ③ 30분 1개만 선택해 신청 요약이 "30분"으로 표시 ④ 4시간 초과 선택 시 안내 메시지. 각 결과를 보고에 기록한다.

**보고에 포함할 것**: 변경 파일 목록, 검증 명령별 결과, 수동 시나리오 4건 결과, 판단 지점과 근거, 보류 항목, `git status --short` 출력.
