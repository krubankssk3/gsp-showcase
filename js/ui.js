/* =========================================================
   ui.js — SweetAlert2 ธีม GSP + การ์ดผู้พัฒนาระบบ (ES5)
   โหลดหลัง api.js และก่อน public.js / admin.js
   ต้องโหลด https://cdn.jsdelivr.net/npm/sweetalert2@11 ก่อน (ถ้าโหลดไม่ได้ ระบบจะใช้กล่องแจ้งเตือนเดิมแทน)
   ========================================================= */
var UI = (function () {
  'use strict';
  var esc = U.esc;
  var has = function () { return typeof window.Swal !== 'undefined' && window.Swal.mixin; };
  var S = null, T = null, oldToast = U.toast;

  function init() {
    if (!has()) return;
    S = window.Swal.mixin({
      showClass: { popup: 'gsw-in', backdrop: 'swal2-backdrop-show' },
      hideClass: { popup: 'gsw-out', backdrop: 'swal2-backdrop-hide' },
      customClass: { popup: 'gsw', confirmButton: 'gsw-ok', cancelButton: 'gsw-cancel', denyButton: 'gsw-cancel' },
      buttonsStyling: false, reverseButtons: true, confirmButtonText: 'ตกลง', cancelButtonText: 'ยกเลิก'
    });
    T = window.Swal.mixin({
      toast: true, position: 'top-end', showConfirmButton: false, timer: 2600, timerProgressBar: true,
      showClass: { popup: 'gsw-toast-in' }, hideClass: { popup: 'gsw-toast-out' },
      customClass: { popup: 'gsw gsw-toast' },
      didOpen: function (el) { el.addEventListener('mouseenter', window.Swal.stopTimer); el.addEventListener('mouseleave', window.Swal.resumeTimer); }
    });
    /* แทนที่ toast เดิมทั้งระบบ */
    U.toast = function (msg, type) {
      T.fire({ icon: type === 'err' ? 'error' : type === 'ok' ? 'success' : 'info', title: String(msg) });
    };
  }

  /* ---------- ตัวโหลด: วงเวียนกำลังวาดวงกลม ---------- */
  var LOADER = '<svg class="gl" viewBox="0 0 140 140" aria-hidden="true">' +
    '<defs><pattern id="glg" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#dfe6f3" stroke-width="1"/></pattern></defs>' +
    '<rect x="4" y="4" width="132" height="132" rx="22" fill="url(#glg)"/>' +
    '<path d="M70 70H124M70 70V16" stroke="#c9d3e8" stroke-dasharray="3 4"/>' +
    '<path class="gl-arc" d="M70 28 A42 42 0 1 1 69.99 28" fill="none" stroke="#2357d9" stroke-width="3.5" stroke-linecap="round"/>' +
    '<g class="gl-arm"><line x1="70" y1="70" x2="70" y2="28" stroke="#14213d" stroke-width="2" stroke-dasharray="4 3"/>' +
    '<circle cx="70" cy="28" r="6" fill="#2357d9" stroke="#fff" stroke-width="2.5"/></g>' +
    '<circle cx="70" cy="70" r="6" fill="#d8423b" stroke="#fff" stroke-width="2.5"/>' +
    '<text x="78" y="86" font-family="Georgia,serif" font-style="italic" font-size="14" fill="#14213d">O</text></svg>';
  function dots() { return '<div class="gl-dots"><span></span><span></span><span></span><span></span></div>'; }
  function loading(text, sub) {
    if (!has()) return;
    S.fire({
      html: '<div class="gl-wrap">' + LOADER + '<div class="gl-t">' + esc(text || 'กำลังโหลดข้อมูล…') + '</div>' +
        '<div class="gl-s">' + esc(sub || 'กรุณารอสักครู่') + '</div>' + dots() + '<div class="gl-m mono">r = 4.20 cm · m∠ = 360°</div></div>',
      width: 340, allowOutsideClick: false, allowEscapeKey: false, showConfirmButton: false, customClass: { popup: 'gsw gsw-load' }
    });
  }
  function close() { if (has() && window.Swal.isVisible()) window.Swal.close(); }

  function confirm(o) {
    if (!has()) return Promise.resolve(false);
    return S.fire({
      icon: o.icon || (o.danger ? 'warning' : 'question'), title: o.title || 'ยืนยันการทำรายการ', html: o.html || '',
      showCancelButton: true, confirmButtonText: o.ok || 'ยืนยัน', cancelButtonText: o.cancel || 'ยกเลิก', focusCancel: !!o.danger,
      customClass: { popup: 'gsw', confirmButton: o.danger ? 'gsw-ok gsw-danger' : 'gsw-ok', cancelButton: 'gsw-cancel' }
    }).then(function (r) { return !!r.isConfirmed; });
  }
  function success(title, html) {
    if (!has()) { oldToast(title, 'ok'); return Promise.resolve(); }
    return S.fire({ icon: 'success', title: title, html: html || '', timer: 1700, showConfirmButton: false });
  }
  function error(msg, title) {
    if (!has()) { oldToast(msg, 'err'); return Promise.resolve(); }
    return S.fire({ icon: 'error', title: title || 'เกิดข้อผิดพลาด', html: esc(msg) });
  }
  function info(title, html) {
    if (!has()) { oldToast(title); return Promise.resolve(); }
    return S.fire({ icon: 'info', title: title, html: html || '' });
  }

  /* ---------- ประกายดาว ---------- */
  function sparkles(el, n) {
    if (!el) return;
    for (var i = 0; i < (n || 16); i++) {
      var sp = document.createElement('span');
      sp.className = 'gsp-star' + (i % 4 === 0 ? ' big' : '');
      sp.style.left = (Math.random() * 96 + 2) + '%';
      sp.style.top = (Math.random() * 88 + 4) + '%';
      sp.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      sp.style.animationDuration = (2.6 + Math.random() * 2.6).toFixed(2) + 's';
      el.appendChild(sp);
    }
  }

  /* ---------- การ์ดผู้พัฒนาระบบ ---------- */
  var settings = {};
  function setSettings(st) { settings = st || {}; }
  function devModal() {
    var s = settings;
    var name = s.devName || 'นายชิติพัทธ์ นิลวรรณ';
    var pos = s.devPosition || 'ครู';
    var initial = name.replace(/^(นาย|นางสาว|นาง|ดร\.)\s*/, '').charAt(0);
    var photo = s.devPhotoUrl ? '<img src="' + esc(s.devPhotoUrl) + '" alt="รูปผู้พัฒนา">' : '<div class="dv-ini">' + esc(initial) + '</div>';
    function contact(bg, path, label, value, href) {
      return '<a class="dv-c glow" href="' + esc(href) + '" target="_blank" rel="noopener"><span class="ic" style="background:' + bg + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + path + '"/></svg></span>' +
        '<span class="tx"><small>' + label + '</small><b>' + esc(value) + '</b></span></a>';
    }
    var c = '';
    if (s.devGithub) c += contact('#14213d', 'M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-1-2.5c3 0 6-2 6-5.5a4.5 4.5 0 0 0-1.2-3.1 4 4 0 0 0-.1-3S17.5 3 15 4.7a12 12 0 0 0-6 0C6.5 3 5.3 3.4 5.3 3.4a4 4 0 0 0-.1 3A4.5 4.5 0 0 0 4 9.5C4 13 7 15 10 15a3 3 0 0 0-1 2.5V21', 'GitHub', s.devGithub, 'https://github.com/' + s.devGithub);
    if (s.devEmail) c += contact('#d8423b', 'M3 5h18v14H3zM3 7l9 6 9-6', 'อีเมล', s.devEmail, 'mailto:' + s.devEmail);
    if (s.devLine) c += contact('#23905a', 'M4 5h16v11H9l-5 4z', 'LINE', s.devLine, 'https://line.me/ti/p/~' + s.devLine);
    if (s.devFacebook) c += contact('#2357d9', 'M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z', 'Facebook', s.devFacebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, ''), /^https?:/.test(s.devFacebook) ? s.devFacebook : 'https://facebook.com/' + s.devFacebook);
    var tech = [['The Geometer\'s Sketchpad', '#e8eefc', '#2357d9'], ['Google Apps Script', '#e3f4ea', '#23905a'], ['Google Sheets', '#e3f4ea', '#1b7a4a'],
      ['Vercel', '#eef0f4', '#14213d'], ['Tailwind CSS', '#e0f2fe', '#075985'], ['SweetAlert2', '#fbe9e8', '#b3332c']];
    var html = '<div class="dv">' +
      '<div class="dv-hero bp" id="dvHero">' +
      '<svg class="dv-art" viewBox="0 0 300 160" aria-hidden="true" fill="none"><circle cx="230" cy="80" r="60" stroke="#5b8cff" stroke-dasharray="4 5"/>' +
      '<path d="M230 20 L282 110 L178 110Z" stroke="#46d9ff" stroke-width="1.6"/><circle cx="230" cy="80" r="30" stroke="#f6c445" stroke-width="1.6"/>' +
      '<circle cx="230" cy="20" r="4" fill="#ff6b6b"/><circle cx="282" cy="110" r="4" fill="#5b8cff"/><circle cx="178" cy="110" r="4" fill="#5b8cff"/><circle cx="230" cy="80" r="4" fill="#fff"/></svg>' +
      '<div class="dv-top"><span class="dv-pill">ผู้พัฒนาระบบ</span><span class="dv-pill gold">' + esc(s.version || 'GSP Showcase v3') + '</span></div>' +
      '<div class="dv-sys">ผลงานการแข่งขัน <span class="dv-shine">GSP</span></div>' +
      '<div class="dv-sys2">The Geometer\'s Sketchpad · ระดับประถมศึกษา</div></div>' +
      '<div class="dv-body"><div class="dv-id"><div class="dv-ring"><div class="dv-ph">' + photo + '</div></div>' +
      '<div class="dv-nm"><div class="dv-name">' + esc(name) + '</div><div class="dv-pos">ตำแหน่ง ' + esc(pos) + '</div>' +
      (s.devOrg ? '<div class="dv-org">' + esc(s.devOrg) + '</div>' : '') + '</div></div>' +
      (s.devBio ? '<p class="dv-bio">' + esc(s.devBio) + '</p>' : '') +
      '<div class="dv-tech">' + tech.map(function (t) { return '<span style="background:' + t[1] + ';color:' + t[2] + '">' + esc(t[0]) + '</span>'; }).join('') + '</div>' +
      (c ? '<div class="dv-cs">' + c + '</div>' : '<p class="dv-note">ยังไม่ได้ระบุช่องทางติดต่อ — ตั้งค่าได้ที่หน้า Admin → ตั้งค่าระบบ → ข้อมูลผู้พัฒนา</p>') +
      '<p class="dv-foot">พัฒนาโดย ' + esc(name) + ' ตำแหน่ง ' + esc(pos) + (s.devOrg ? ' ' + esc(s.devOrg) : '') + '</p></div></div>';
    if (!has()) { U.dialog('ผู้พัฒนาระบบ', html); return; }
    S.fire({
      html: html, width: 620, showConfirmButton: false, showCloseButton: true, closeButtonAriaLabel: 'ปิด',
      customClass: { popup: 'gsw gsw-dev' },
      didOpen: function (el) { sparkles(el.querySelector('#dvHero'), 18); }
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('[data-dev]') : null;
    if (b) { e.preventDefault(); devModal(); }
  });

  init();
  return { loading: loading, close: close, confirm: confirm, success: success, error: error, info: info, devModal: devModal, setSettings: setSettings, sparkles: sparkles, ready: has };
})();

/* =========================================================
   Fx — เฟดข้อมูลขึ้นมา + เอฟเฟควิ๊บวับ (ใช้อัตโนมัติทุกหน้า)
   - ทุกการ์ด/แถว/แผงข้อมูลที่เกิดขึ้นใหม่ จะค่อยๆ ลอยขึ้นเมื่อเลื่อนมาถึง (ทีละชิ้น)
   - การ์ดมีแสงวิ่งผ่าน 1 ครั้ง, อันดับ 1–3 มีประกายดาว, ตัวเลขสถิตินับขึ้น, กราฟค่อยๆ วาดตัว
   ========================================================= */
var Fx = (function () {
  'use strict';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEL = ['.card', '.pod', '.prob', '.stat', '.bp-card', '.kpi', '.panel', '.ann-group', '.tbl tbody tr', '.year-tbl tbody tr',
    '.lb-row', '.log', '.logo-card', '.filelist .file', '.mini', '.top-list .it', '.sec-head', '.champ', '.comp-year',
    '.up-item', '.announce', '.page-head', '.toolbar', '.pager', '.legend-d', '.dv-c', '.school-qr'].join(',');
  var SWEEP = '.card, .pod, .prob, .kpi, .stat, .bp-card, .logo-card, .champ';
  var COUNT = '.kpi b, .nk b, .mini b, .school-stats .stat b, .rp-stats b';
  var SKIP = '.swal2-container, #reportRoot, #stats4, .modal-foot';
  var io = null, pending = false;

  function skip(el) { return !!(el.closest && el.closest(SKIP)); }
  function sibIndex(el) {
    var i = 0, p = el.previousElementSibling;
    while (p && i < 14) { if (p.classList && p.classList.contains('fx')) i++; p = p.previousElementSibling; }
    return i;
  }
  function prep(el) {
    if (el._fx || skip(el)) return;
    el._fx = 1;
    /* แผงที่มีตาราง: ไม่เฟดทั้งแผง ให้แถวในตารางค่อยๆ ขึ้นแทน */
    if (el.matches && el.matches('.panel, .ann-group') && el.querySelector('table')) return;
    if (REDUCED || !io) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--fxd', Math.min(sibIndex(el) * 55, 650) + 'ms');
    el.classList.add('fx');
    if (el.tagName === 'TR') el.classList.add('fx-row');
    io.observe(el);
    /* ถ้าองค์ประกอบอยู่บนจออยู่แล้วแต่ IO ยังไม่ทำงาน ให้แสดงภายหลังกันค้าง */
    if (r.top < innerHeight && r.bottom > 0) setTimeout(function () { if (!el._shown) show(el); }, 1600);
  }
  function show(el) {
    if (el._shown) return;
    el._shown = 1;
    if (io) io.unobserve(el);
    var d = parseInt(el.style.getPropertyValue('--fxd'), 10) || 0;
    el.classList.add('fx-show');
    setTimeout(function () {
      el.classList.remove('fx', 'fx-show', 'fx-row');
      el.style.removeProperty('--fxd');
    }, d + 900);
    if (el.matches && el.matches(SWEEP)) sweep(el, d);
    if (el.tagName === 'TR') setTimeout(function () { el.classList.add('fx-flash'); setTimeout(function () { el.classList.remove('fx-flash'); }, 1300); }, d + 150);
    if (el.matches && el.matches('.t1, .t2, .t3, .champ')) setTimeout(function () { burst(el); }, d + 350);
    U.$$(COUNT, el).concat(el.matches && el.matches(COUNT) ? [el] : []).forEach(function (b) { countUp(b, d); });
    if (el.querySelector) U.$$('svg.chart', el).forEach(function (sv) { drawChart(sv, d); });
  }
  /* แสงวิ่งผ่าน 1 ครั้ง */
  function sweep(el, d) {
    var s = document.createElement('span');
    s.className = 'fx-sweep';
    s.style.animationDelay = (d + 200) + 'ms';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, d + 1500);
  }
  /* ประกายดาวแตกออก */
  function burst(el) {
    var n = 7, i;
    for (i = 0; i < n; i++) {
      var sp = document.createElement('span');
      sp.className = 'fx-spark';
      sp.style.left = (8 + Math.random() * 84) + '%';
      sp.style.top = (6 + Math.random() * 60) + '%';
      sp.style.animationDelay = (i * 90) + 'ms';
      var z = 8 + Math.random() * 10;
      sp.style.width = z + 'px'; sp.style.height = z + 'px';
      el.appendChild(sp);
      (function (x) { setTimeout(function () { if (x.parentNode) x.parentNode.removeChild(x); }, 1600 + i * 90); })(sp);
    }
  }
  /* ตัวเลขนับขึ้น */
  function countUp(b, d) {
    if (b._counted) return;
    var node = b.firstChild;
    if (!node || node.nodeType !== 3) return;
    var txt = node.nodeValue, m = /^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/.exec(txt.trim());
    if (!m) return;
    b._counted = 1;
    var target = Number(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') > -1;
    if (!isFinite(target) || target === 0) return;
    var t0 = null, dur = 900;
    function fmt(v) {
      var s = v.toFixed(dec);
      if (comma || Math.abs(target) >= 1000) { var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = p.join('.'); }
      return m[1] + s + m[3];
    }
    node.nodeValue = fmt(0);
    setTimeout(function () {
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        node.nodeValue = fmt(target * e);
        if (p < 1) requestAnimationFrame(step); else { node.nodeValue = txt; b.classList.add('fx-pop'); setTimeout(function () { b.classList.remove('fx-pop'); }, 600); }
      }
      requestAnimationFrame(step);
    }, d);
  }
  /* กราฟค่อยๆ วาดตัว: เส้นลากตาม, แท่งโตขึ้น, จุดเด้ง */
  function drawChart(sv, d) {
    if (sv._drawn) return;
    sv._drawn = 1;
    U.$$('path', sv).forEach(function (p, i) {
      if (!p.getTotalLength || p.getAttribute('fill') !== 'none' || p.getAttribute('stroke-dasharray')) return;
      var L = 0;
      try { L = p.getTotalLength(); } catch (e) { return; }
      if (!L || L < 30) return;
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      p.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(.4,0,.2,1) ' + (d + 150 + i * 60) + 'ms';
      requestAnimationFrame(function () { requestAnimationFrame(function () { p.style.strokeDashoffset = 0; }); });
      setTimeout(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; }, d + 1700 + i * 60);
    });
    U.$$('rect[rx="3"]', sv).forEach(function (r, i) { r.classList.add('fx-bar'); r.style.animationDelay = (d + 120 + i * 45) + 'ms'; });
    U.$$('circle[r="5.5"]', sv).forEach(function (c, i) { c.classList.add('fx-dot'); c.style.animationDelay = (d + 500 + i * 40) + 'ms'; });
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    U.$$('.bp', root).forEach(function (b) { if (!b._stars && !b.closest('.swal2-container')) { b._stars = 1; UI.sparkles(b, 22); } });
    if (root.matches && root.matches(SEL)) prep(root);
    U.$$(SEL, root).forEach(prep);
  }
  function queue() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(document.body); });
  }
  function init() {
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) show(e.target); });
      }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
    }
    scan(document.body);
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) if (muts[i].addedNodes.length) { queue(); return; }
      }).observe(document.body, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { scan: scan, burst: burst };
})();
