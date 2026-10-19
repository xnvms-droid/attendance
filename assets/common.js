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

  // ---------- 직원키 (직원용 링크 ?k=... 로 한 번 열면 기기에 저장, 주소창에서는 지움) ----------
  function staffKey() {
    var q = new URLSearchParams(location.search);
    var k = q.get('k');
    if (k) {
      store.set('staff_key', k);
      q.delete('k');
      var rest = q.toString();
      try { history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
      return k;
    }
    return store.get('staff_key') || '';
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

  // 좌석번호(1~10) → 격자 열 번호 (1열은 문 표시용, 통로 3개 포함)
  function gridCol(c) {
    var col = 1, n = 0;
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
   * @param {HTMLElement} el 넣을 위치
   * @param {Object} opt { onSeat(id, btn), fill(id, btn) }
   */
  function renderSeatMap(el, opt) {
    opt = opt || {};
    el.innerHTML = '';
    var room = document.createElement('div');
    room.className = 'room';
    room.innerHTML =
      '<div class="room-front"><div>화이트보드</div><div class="screen">스크린</div><div>단상</div></div>';

    var grid = document.createElement('div');
    grid.className = 'seat-grid';
    // 문표시 | 2 | 통로 | 3 | 통로 | 3 | 통로 | 2 | 창문표시
    grid.style.gridTemplateColumns =
      'var(--door-w) repeat(2, var(--seat-w)) var(--aisle) repeat(3, var(--seat-w)) var(--aisle) ' +
      'repeat(3, var(--seat-w)) var(--aisle) repeat(2, var(--seat-w)) var(--door-w)';

    function door(text, row, col, cls) {
      var d = document.createElement('div');
      d.className = 'door ' + (cls || '');
      d.textContent = text;
      d.style.gridRow = row;
      d.style.gridColumn = col;
      grid.appendChild(d);
    }

    function seat(id, row, col) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seat';
      b.dataset.id = id;
      b.style.gridRow = row;
      b.style.gridColumn = col;
      b.innerHTML = '<span class="no">' + id + '</span><span class="nm"></span>';
      if (opt.onSeat) b.addEventListener('click', function () { opt.onSeat(id, b); });
      grid.appendChild(b);
      return b;
    }

    for (var r = 1; r <= LAYOUT.rows; r++) {
      for (var c = 1; c <= 10; c++) seat(r + '-' + c, r, gridCol(c));
    }
    // 9열: 오른쪽 2석 묶음 아래에 3석 (배치도와 동일)
    var back = document.createElement('div');
    back.className = 'back-row';
    back.style.gridRow = LAYOUT.backRow;
    back.style.gridColumn = gridCol(9) + ' / ' + (gridCol(10) + 1);
    grid.appendChild(back);
    for (var k = 1; k <= LAYOUT.backCount; k++) {
      var b = seat(LAYOUT.backRow + '-' + k, 1, k);
      back.appendChild(b);
    }

    door('앞문 ▶', 1, 1, 'left');
    door('뒷문 ▶', LAYOUT.backRow, 1, 'left');
    door('◀ 창문', 5, gridCol(10) + 1, 'right');

    room.appendChild(grid);
    var desk = document.createElement('div');
    desk.className = 'staff-desk';
    desk.textContent = '직원책상';
    room.appendChild(desk);
    el.appendChild(room);
    return room;
  }

  function updateSeats(el, fill) {
    el.querySelectorAll('.seat').forEach(function (b) { fill(b.dataset.id, b); });
  }

  window.APP = {
    CFG: CFG, api: api, hmac: hmac, store: store, staffKey: staffKey, hhmmss: hhmmss, esc: esc,
    seatLabel: seatLabel, renderSeatMap: renderSeatMap, updateSeats: updateSeats
  };
})();
