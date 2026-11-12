// ==================================================
// 공통 기능: API 호출, HMAC 서명, 저장소, 좌석배치도 그리기
// ==================================================
(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};

  // ---------- API ----------
  // text/plain + credentials:'omit' → 구글 로그인 상태와 관계없이 호출 (사전요청(preflight) 없음)
  async function api(action, data, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 15000);
    try {
      var body = Object.assign({ action: action }, data || {});
      var res = await fetch(CFG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        credentials: 'omit',
        redirect: 'follow',
        signal: ctrl.signal
      });
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- HMAC-SHA256 → base64url ----------
  var enc = new TextEncoder();
  var keyCache = new Map();
  async function hmac(keyStr, msg) {
    var key = keyCache.get(keyStr);
    if (!key) {
      key = await crypto.subtle.importKey('raw', enc.encode(keyStr), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      keyCache.set(keyStr, key);
    }
    var sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
    var s = '';
    for (var i = 0; i < sig.length; i++) s += String.fromCharCode(sig[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // ---------- 저장소 (사용 불가 환경에서도 오류 없이 동작) ----------
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
    getJSON: function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    setJSON: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- 직원키 ----------
  // 직원용 링크(?k=...)로 연 "그 탭"에서만 직원 모드가 유지됩니다. (sessionStorage = 탭 단위 저장)
  // 같은 컴퓨터에서 공개 빔 화면(board.html)을 다른 탭·창으로 열면 직원 모드가 아닙니다.
  var tabStore = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  function staffKey() {
    store.del('staff_key');   // 예전 버전이 브라우저 전체에 저장해 둔 직원키 삭제
    var q = new URLSearchParams(location.search);
    var k = q.get('k');
    if (k) {
      tabStore.set('staff_key', k);
      q.delete('k');
      var rest = q.toString();
      try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
      return k;
    }
    return tabStore.get('staff_key') || '';
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hhmmss(d) { d = d || new Date(); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function seatLabel(id) {
    var p = String(id).split('-');
    return p[0] + '열 ' + p[1] + '번';
  }

  // ---------- 강의실 배치도 ----------
  // 1~8열 × 10석 [2 | 3 | 3 | 2], 9열(뒷문 쪽 오른편) 3석
  var LAYOUT = { rows: 8, groups: [2, 3, 3, 2], backRow: 9, backCount: 3 };
  var GROUP_NAMES = ['앞문 쪽 2인석', '가운데 왼쪽 3인석', '가운데 오른쪽 3인석', '창문 쪽 2인석'];

  /** 좌석 위치를 말로 풀어 쓰기 (예: 앞에서 3번째 줄 · 스크린을 볼 때 왼쪽에서 5번째 자리) */
  function seatDesc(id) {
    var p = String(id).split('-'), r = Number(p[0]), c = Number(p[1]);
    if (r === LAYOUT.backRow) return '맨 뒤 줄(뒷문 쪽 오른편 3석) · 왼쪽에서 ' + c + '번째 자리';
    var n = 0, g = 0, inG = 0;
    for (g = 0; g < LAYOUT.groups.length; g++) {
      if (c <= n + LAYOUT.groups[g]) { inG = c - n; break; }
      n += LAYOUT.groups[g];
    }
    var rowTxt = r === 1 ? '맨 앞 줄(1번째)' : '앞에서 ' + r + '번째 줄';
    return rowTxt + ' · 스크린을 볼 때 왼쪽에서 ' + c + '번째 자리 (' + GROUP_NAMES[g] + ' 중 ' + inG + '번째)';
  }

  // 격자 열: 1=문 표시, 2=줄 번호, 3~ 좌석(통로 3개 포함), 마지막=창문 표시
  function gridCol(c) {
    var col = 2, n = 0;
    for (var g = 0; g < LAYOUT.groups.length; g++) {
      for (var s = 0; s < LAYOUT.groups[g]; s++) {
        n++; col++;
        if (n === c) return col;
      }
      col++; // 통로
    }
    return col;
  }

  /**
   * 배치도 그리기
   * - 맨 위: 좌석 번호(왼쪽부터 1~10), 왼쪽: 줄 번호(앞에서 1~9열)
   * @param {HTMLElement} el 넣을 위치
   * @param {Object} opt { onSeat(id, btn) }
   */
  function renderSeatMap(el, opt) {
    opt = opt || {};
    el.innerHTML = '';
    var room = document.createElement('div');
    room.className = 'room';
    room.innerHTML =
      '<div class="room-front"><div>화이트보드</div><div class="screen">스크린 (앞)</div><div>단상</div></div>';

    var grid = document.createElement('div');
    grid.className = 'seat-grid';
    // 문표시 | 줄번호 | 2 | 통로 | 3 | 통로 | 3 | 통로 | 2 | 창문표시
    grid.style.gridTemplateColumns =
      'var(--door-w) var(--rowlab-w) repeat(2, var(--seat-w)) var(--aisle) repeat(3, var(--seat-w)) var(--aisle) ' +
      'repeat(3, var(--seat-w)) var(--aisle)
