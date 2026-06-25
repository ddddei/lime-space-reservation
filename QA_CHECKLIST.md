# QA Checklist

## 참가자

- [ ] 26명 전체 로그인 확인
- [ ] Level 2 14명 확인
- [ ] Level 1 12명 확인
- [ ] 각 참가자 예약 신청 확인
- [ ] 각 참가자 내 신청 확인
- [ ] 각 참가자 신청 취소 확인
- [ ] 취소 후 기본 목록 숨김 확인
- [ ] `취소된 신청 보기`에서 cancelled 표시 확인
- [ ] 로그아웃 확인

## 관리자

- [ ] 한필구 로그인 확인
- [ ] 참여자 체크리스트 조회 확인
- [ ] 전체 신청 목록 조회 확인
- [ ] 새로고침 확인
- [ ] 관리자 취소 확인
- [ ] 관리자 취소 후 참여자 화면 반영 확인
- [ ] 관리자 로그아웃 확인

## 디자인

- [ ] Typography 제목 크기 확인
- [ ] 본문 line-height 확인
- [ ] 버튼/Badge 글씨 크기 확인
- [ ] 아이콘 크기와 정렬 확인
- [ ] 카드 spacing/radius/shadow 확인
- [ ] Modal padding/scroll/sticky 확인
- [ ] Discord 문의 카드 확인

## Responsive

- [ ] 375px
- [ ] 768px
- [ ] 1024px
- [ ] 1280px
- [ ] 모바일 가로 overflow 없음
- [ ] 태블릿 가로 overflow 없음
- [ ] 데스크탑 레이아웃 안정

## DB

- [ ] participants 유지
- [ ] admins 유지
- [ ] spaces 유지
- [ ] space_images 유지
- [ ] operating_hours 유지
- [ ] admin_blocks 유지
- [ ] meetings = 0
- [ ] sessions = 0

## 운영

- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `git diff --check`
- [ ] 운영 SQL 순서 확인
- [ ] 배포 환경 변수 확인
- [ ] 운영 URL smoke test
