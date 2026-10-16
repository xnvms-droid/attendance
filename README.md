# 보수교육 출석 및 좌석지정 시스템 (오프라인 교육 전용)

부산광역시사회복지사협회 오프라인 보수교육의 QR 출석 확인과 실시간 좌석지정에 사용하는 화면입니다.
데이터 처리는 Google Apps Script 웹 앱이 담당합니다.

| 파일 | 사용자 | 기능 |
|---|---|---|
| `q.html` | 수강생 | 개인별 출석 QR, 5분 유효시간 빨간 타이머(만료 시 자동 재발급) |
| `scan.html` | 직원 | 휴대폰 카메라 QR 스캐너, 수동 출석, 2D 바코드 스캐너 입력 지원 |
| `seat.html` | 수강생 | 이름·생년월일 6자리 확인 후 좌석 선택 (실시간 반영) |
| `board.html` | 직원·대형화면 | 실시간 좌석 현황판, 좌석 해제·직접 배정, A3 배치도 인쇄 |
| `index.html` | 직원 | 메뉴, 서버 연결 확인, 교육장 게시용 좌석등록 QR 안내문 인쇄 |
| `config.js` | — | Apps Script 웹 앱 주소(API_URL) 설정 |

## 배포
1. 이 폴더의 파일 전체를 GitHub 저장소에 올립니다.
2. 저장소 Settings → Pages → Branch `main` / `(root)` 저장.
3. `config.js`의 `API_URL`에 Apps Script 웹 앱 주소(/exec)를 입력합니다.
4. Apps Script `Config.gs`의 `PAGES_BASE_URL`에 GitHub Pages 주소를 입력합니다.

## 사용 라이브러리 (vendor 폴더, 외부 CDN 미사용)
- qr-scanner 1.4.2 (MIT, Nimiq) — QR 인식
- qrcode-generator 1.4.4 (MIT, Kazuhiko Arase) — QR 생성
