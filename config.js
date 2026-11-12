// ==================================================
// ⭐ 배포 후 이 파일만 수정하면 됩니다 ⭐
// ==================================================
window.APP_CONFIG = {
  // Apps Script 웹 앱 주소 (배포 → 웹 앱 URL, /exec 로 끝남)
  API_URL: 'https://script.google.com/macros/s/AKfycby_mnpWBjtsBMlhVLJ5WywnAHC7FFz781VExURWS3tfMiGKmIyet904lhPRJMH1ekNI/exec',

  // QR 유효시간(초) - Apps Script Config.gs의 QR_VALID_SEC와 같은 값
  QR_VALID_SEC: 300,

  ORG_NAME: '부산광역시사회복지사협회',

  // 빔스크린 현황판에 표시할 교육장 Wi-Fi (최대 2개, 비우면 표시 안 함)
  // ssid: 와이파이 이름(대소문자 정확히), pw: 비밀번호
  WIFI: [
    { name: '제1강의실 [1]', ssid: 'KT_GiGA_5G_83E4', pw: '1xkdedb697' },
    { name: '제1강의실 [2]', ssid: 'KT_GiGA_5G_565C', pw: '9ceb43kd41' }
  ]
};
