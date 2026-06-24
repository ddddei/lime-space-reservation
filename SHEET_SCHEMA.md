# Google Sheet Schema

이 문서는 Google Sheet/API 연동 전 필요한 시트 구조 초안입니다. 각 시트의 첫 행은 컬럼명으로 고정하고, 시간 값은 `HH:mm`, 날짜 값은 `YYYY-MM-DD`, 일시 값은 ISO 문자열 사용을 권장합니다.

## Settings

| Column | Type | Description |
|---|---|---|
| key | string | 설정 키 |
| value | string | 설정 값 |
| description | string | 설정 설명 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Spaces

| Column | Type | Description |
|---|---|---|
| spaceId | string | 공간 ID |
| name | string | 공간명 |
| category | youth-building \| lifestyle | 공간 분류 |
| capacity | number | 정원 |
| description | string | 공간 설명 |
| imageUrl | string | 공간 사진 URL |
| features | string | 쉼표로 구분한 특징 목록 |
| isActive | boolean | 예약 노출 여부 |
| sortOrder | number | 정렬 순서 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Users

사용자 로그인/본인 확인은 기본적으로 Users 시트의 `name` + `phoneLast4` 조합으로 확인한다. 동명이인 또는 전화번호 뒤 4자리 중복으로 동일 조건의 사용자가 여러 명 조회되면 `name` + `phone` 전체 전화번호로 추가 확인해야 한다. Users 시트에 없는 사람은 공간 예약 및 모임 신청을 할 수 없다.

| Column | Type | Description |
|---|---|---|
| userId | string | 참여자 ID |
| name | string | 이름 |
| phone | string | 전화번호 |
| phoneLast4 | string | 전화번호 끝 4자리 |
| level | 1 \| 2 | 신청 레벨 |
| hasPlan | boolean | 기획안 제출 여부 |
| hasBudget | boolean | 예산안 제출 여부 |
| hasPromotion | boolean | 홍보물 제출 여부 |
| hasAdminApproval | boolean | 관리자 최종 승인 여부 |
| maxBlocks | number | 총 신청 가능 블록 수 |
| memo | string | 관리자 메모 |
| isActive | boolean | 활성 사용자 여부 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Meetings

| Column | Type | Description |
|---|---|---|
| meetingId | string | 모임 ID |
| applicantUserId | string | 신청자 userId |
| applicantName | string | 신청자 이름 스냅샷 |
| phoneLast4 | string | 신청자 전화번호 끝 4자리 스냅샷 |
| level | 1 \| 2 | 신청 당시 레벨 |
| meetingName | string | 모임명 |
| purpose | string | 모임 목적 |
| status | draft \| submitted \| approved \| rejected | 모임 상태 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## Sessions

| Column | Type | Description |
|---|---|---|
| sessionId | string | 회차/예약 ID |
| meetingId | string | 연결된 모임 ID |
| sessionIndex | number | 모임 내 회차 순서 |
| spaceId | string | 예약 공간 ID |
| date | YYYY-MM-DD | 예약 날짜 |
| startTime | HH:mm | 시작 시간 |
| endTime | HH:mm | 종료 시간 |
| blockCount | number | 30분 단위 블록 수 |
| status | requested \| confirmed \| cancelled | 예약 상태 |
| createdAt | ISO datetime | 생성 시각 |
| updatedAt | ISO datetime | 마지막 수정 시각 |

## AdminBlocks

| Column | Type | Description |
|---|---|---|
| blockId | string | 차단 일정 ID |
| spaceId | string | 차단 공간 ID |
| date | YYYY-MM-DD | 차단 날짜 |
| startTime | HH:mm | 시작 시간 |
| endTime | HH:mm | 종료 시간 |
| reason | string | 차단 사유 |
| createdBy | string | 등록자 |
| isActive | boolean | 활성 차단 여부 |
| createdAt | ISO datetime | 생성 시각 |

## AuditLogs

| Column | Type | Description |
|---|---|---|
| logId | string | 로그 ID |
| actorType | user \| admin \| system | 실행 주체 |
| actorId | string | 실행 주체 ID |
| action | string | 수행 작업 |
| entityType | Settings \| Spaces \| Users \| Meetings \| Sessions \| AdminBlocks | 대상 시트/도메인 |
| entityId | string | 대상 ID |
| beforeJson | JSON string | 변경 전 값 |
| afterJson | JSON string | 변경 후 값 |
| createdAt | ISO datetime | 로그 생성 시각 |
