/* =========================================================
   api.js — ตัวช่วยร่วม (U), ไอคอน (ICON), ภาพตัวอย่าง (Art),
            ฐานข้อมูลโหมดสาธิต (Demo) และตัวเรียก Backend (API)
   หมายเหตุ: เขียนแบบ ES5 ทั้งไฟล์
   ========================================================= */

/* ---------------- U: helpers ---------------- */
var U = (function () {
  'use strict';
  var TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.getDate() + ' ' + TH_MONTH[d.getMonth()] + ' ' + (d.getFullYear() + 543);
  }
  function fmtDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso || '';
    var hh = ('0' + d.getHours()).slice(-2), mm = ('0' + d.getMinutes()).slice(-2);
    return fmtDate(iso) + ' ' + hh + ':' + mm;
  }
  function rankLabel(r) {
    r = Number(r);
    if (r === 1) return 'ชนะเลิศ';
    if (r === 2) return 'รองชนะเลิศอันดับ 1';
    if (r === 3) return 'รองชนะเลิศอันดับ 2';
    return 'ลำดับที่ ' + r;
  }
  function medalAuto(score, st) {
    var s = Number(score);
    if (score === '' || score === null || isNaN(s)) return '';
    st = st || {};
    if (s >= Number(st.goldMin || 80)) return 'ทอง';
    if (s >= Number(st.silverMin || 70)) return 'เงิน';
    if (s >= Number(st.bronzeMin || 60)) return 'ทองแดง';
    return 'เข้าร่วม';
  }
  function medalOf(r, st) { return r.medal || medalAuto(r.score, st); }
  function medalCls(m) {
    return m === 'ทอง' ? 'gold' : m === 'เงิน' ? 'silver' : m === 'ทองแดง' ? 'bronze' : 'none';
  }
  function medalTag(m) {
    if (!m) return '';
    return '<span class="medal ' + medalCls(m) + '">' + (m === 'เข้าร่วม' ? 'เข้าร่วม' : 'เหรียญ' + esc(m)) + '</span>';
  }
  function rankBadge(r) {
    var n = Number(r);
    return '<span class="rank' + (n <= 3 ? ' r' + n : '') + '">' + esc(r) + '</span>';
  }
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : 'file';
  }
  function isGsp(name) { return (CONFIG.GSP_EXT || ['gsp']).indexOf(ext(name)) > -1; }
  function extCls(name) {
    var e = ext(name);
    if (isGsp(name)) return 'gsp';
    if (e === 'pdf') return 'pdf';
    if (/^(png|jpe?g|gif|webp|svg)$/.test(e)) return 'img';
    if (/^(docx?|pptx?|xlsx?)$/.test(e)) return 'doc';
    if (/^(zip|rar|7z)$/.test(e)) return 'zip';
    return '';
  }
  function fmtSize(b) {
    b = Number(b) || 0;
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var ART_CACHE = {};
  function imgSrc(f, w) {
    if (!f) return '';
    if (f.url && f.url.indexOf('art:') === 0) {
      if (!ART_CACHE[f.url]) { var a = f.url.split(':'); ART_CACHE[f.url] = Art.uri(Number(a[1]), Number(a[2])); }
      return ART_CACHE[f.url];
    }
    if (f.url) return f.url;
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(f.id) + '&sz=w' + (w || 1200);
  }
  function dlUrl(f) {
    if (!f) return '#';
    if (f.url && f.url.indexOf('data:') !== 0 && f.url.indexOf('art:') !== 0) return f.url;
    return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(f.id);
  }
  function viewUrl(f) {
    if (!f) return '#';
    if (f.url && f.url.indexOf('data:') !== 0 && f.url.indexOf('art:') !== 0) return f.url;
    return 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view';
  }
  function toast(msg, type) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3000);
  }
  function copy(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    } catch (e) {}
    return Promise.reject(new Error('copy'));
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
    return true;
  }
  function sortResults(a, b, compMap) {
    var ca = compMap[a.competitionId] || {}, cb = compMap[b.competitionId] || {};
    if (ca.year !== cb.year) return Number(cb.year) - Number(ca.year);
    if (ca.level !== cb.level) return String(ca.level).localeCompare(String(cb.level));
    return Number(a.rank) - Number(b.rank);
  }
  /* เอฟเฟกต์เรืองแสงตามตำแหน่งเมาส์ สำหรับทุกองค์ประกอบที่มี class="glow" */
  function bindGlow() {
    document.addEventListener('pointermove', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('.glow') : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
  /* กล่องข้อความทั่วไป (ใช้แสดงวิธีเปิดไฟล์ GSP) */
  function dialog(title, html) {
    var d = document.createElement('div');
    d.className = 'modal-bg'; d.style.zIndex = '150';
    d.innerHTML = '<div class="modal md"><div class="modal-head"><h3>' + esc(title) + '</h3><button class="icon-btn" data-x>' + ICON('x') + '</button></div><div class="modal-body">' + html + '</div></div>';
    function close() { if (d.parentNode) d.parentNode.removeChild(d); }
    d.addEventListener('click', function (e) { if (e.target === d || (e.target.closest && e.target.closest('[data-x]'))) close(); });
    document.body.appendChild(d);
    return close;
  }
  function gspHelp() {
    dialog('วิธีเปิดไฟล์ .gsp (The Geometer\'s Sketchpad)',
      '<ol class="steps-ol">' +
      '<li>ติดตั้งโปรแกรม <b>The Geometer\'s Sketchpad</b> เวอร์ชัน 5 ขึ้นไป (มีทั้งฉบับภาษาไทยและภาษาอังกฤษ)</li>' +
      '<li>กดปุ่มดาวน์โหลดไฟล์ที่มีป้าย <span class="tag" style="background:#2357d9;color:#fff">GSP</span> แล้วบันทึกไว้ในเครื่อง</li>' +
      '<li>ดับเบิลคลิกไฟล์ หรือเปิดโปรแกรม แล้วเลือก <code>File → Open</code> (แฟ้ม → เปิด)</li>' +
      '<li>ถ้า Windows ไม่รู้จักไฟล์ ให้คลิกขวา → <code>Open with</code> → เลือกโปรแกรม Sketchpad</li>' +
      '<li>ถ้าเปิดไม่ขึ้นหรือชื่อไฟล์เพี้ยน ลอง<b>เปลี่ยนชื่อไฟล์เป็นภาษาอังกฤษ</b> โดยคงนามสกุล <code>.gsp</code> ไว้</li>' +
      '<li>ไฟล์จาก GSP 5 เปิดในเวอร์ชันที่ใหม่กว่าได้ แต่ไฟล์จากเวอร์ชันใหม่อาจเปิดในเวอร์ชันเก่าไม่ได้</li>' +
      '</ol><div class="gsp-help" style="margin-top:16px">' + ICON('star') + '<div><b>เคล็ดลับการฝึก:</b> ดาวน์โหลด <b>ไฟล์ตั้งต้น</b> ของโจทย์แต่ละปีไปลองสร้างเอง แล้วค่อยเปิดไฟล์ผลงานที่ได้รางวัลเพื่อดูขั้นตอนการสร้าง (เมนู <code>Display → Show All Hidden</code>)</div></div>');
  }
  return {
    bindGlow: bindGlow, dialog: dialog, gspHelp: gspHelp,
    esc: esc, $: $, $$: $$, fmtDate: fmtDate, fmtDateTime: fmtDateTime, rankLabel: rankLabel,
    medalAuto: medalAuto, medalOf: medalOf, medalCls: medalCls, medalTag: medalTag, rankBadge: rankBadge,
    ext: ext, extCls: extCls, isGsp: isGsp, fmtSize: fmtSize, uid: uid, clone: clone, imgSrc: imgSrc, dlUrl: dlUrl, viewUrl: viewUrl,
    toast: toast, copy: copy, store: store, sortResults: sortResults
  };
})();

/* ---------------- ICON ---------------- */
var ICON = (function () {
  var P = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    dl: '<path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    home: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    upload: '<path d="M12 21V9m0 0-5 5m5-5 5 5M4 3h16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>'
  };
  return function (name, cls) {
    return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (P[name] || '') + '</svg>';
  };
})();

/* โลโก้ระบบ: เข็มทิศเรขาคณิต */
var BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#14213d"/>' +
  '<circle cx="20" cy="22" r="11" stroke="#7fa2f0" stroke-width="1.5" stroke-dasharray="2 2"/>' +
  '<path d="M20 8 11.5 31M20 8l8.5 23" stroke="#fff" stroke-width="2" stroke-linecap="round"/>' +
  '<path d="M14 24h12" stroke="#f2b632" stroke-width="2" stroke-linecap="round"/>' +
  '<circle cx="20" cy="8" r="2.6" fill="#d8423b"/></svg>';

/* ---------------- Art: ภาพตัวอย่างสไตล์ GSP (ใช้ในโหมดสาธิต) ---------------- */
var Art = (function () {
  var PALS = [
    ['#2357d9', '#d8423b', '#f2b632', '#23905a'],
    ['#7a3cc9', '#e8902a', '#1f9bb8', '#d8423b'],
    ['#23905a', '#2357d9', '#e05a9a', '#f2b632'],
    ['#c4402f', '#1d3f8f', '#e8b021', '#3c9a8f'],
    ['#b33fb3', '#2a7fd4', '#f07c2a', '#33a35b']
  ];
  function rng(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function f(n) { return Math.round(n * 10) / 10; }
  function bg() {
    return '<defs><pattern id="g" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#e1e7f3" stroke-width="1"/></pattern></defs>' +
      '<rect width="800" height="600" fill="#fcfdff"/><rect width="800" height="600" fill="url(#g)"/>' +
      '<path d="M0 300H800M400 0V600" stroke="#c9d3e8" stroke-width="1.2"/>';
  }
  function pt(x, y, c, l) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="5" fill="' + c + '" stroke="#fff" stroke-width="1.5"/>' +
      (l ? '<text x="' + f(x + 8) + '" y="' + f(y - 8) + '" font-family="Georgia,serif" font-style="italic" font-size="16" fill="#14213d">' + l + '</text>' : '');
  }
  function measure(txt) {
    return '<rect x="18" y="18" width="' + (txt.length * 8.6 + 20) + '" height="30" rx="4" fill="#fff" stroke="#c9d3e8"/>' +
      '<text x="28" y="38" font-family="monospace" font-size="14" fill="#14213d">' + txt + '</text>';
  }
  function rosette(r, p) {
    var n = 6 + Math.floor(r() * 7), R = 100 + r() * 40, out = '', i, a;
    for (i = 0; i < n; i++) {
      a = i * 2 * Math.PI / n;
      out += '<circle cx="' + f(400 + R * Math.cos(a)) + '" cy="' + f(300 + R * Math.sin(a)) + '" r="' + f(R) + '" fill="' + p[i % p.length] + '" fill-opacity=".10" stroke="' + p[i % p.length] + '" stroke-width="2"/>';
    }
    out += '<circle cx="400" cy="300" r="' + f(R * 2) + '" fill="none" stroke="#14213d" stroke-width="1.5" stroke-dasharray="6 5"/>';
    for (i = 0; i < n; i++) { a = i * 2 * Math.PI / n; out += pt(400 + R * Math.cos(a), 300 + R * Math.sin(a), p[0], i < 3 ? 'ABC'.charAt(i) : ''); }
    return out + pt(400, 300, p[1], 'O') + measure('m∠AOB = ' + (360 / n).toFixed(2) + '°');
  }
  function spiro(r, p) {
    var R = 170, rr = 40 + Math.floor(r() * 70), d = 50 + r() * 70, d1 = '', t, x, y, k = (R - rr) / rr;
    for (t = 0; t <= 2 * Math.PI * rr / 2; t += 0.035) {
      x = 400 + (R - rr) * Math.cos(t) + d * Math.cos(k * t);
      y = 300 + (R - rr) * Math.sin(t) - d * Math.sin(k * t);
      d1 += (d1 ? 'L' : 'M') + f(x) + ' ' + f(y);
    }
    return '<path d="' + d1 + '" fill="none" stroke="' + p[0] + '" stroke-width="1.6" stroke-opacity=".9"/>' +
      '<circle cx="400" cy="300" r="' + R + '" fill="none" stroke="' + p[1] + '" stroke-width="1.5" stroke-dasharray="4 4"/>' +
      pt(400, 300, p[1], 'O') + pt(400 + R, 300, p[2], 'P') + measure('r = ' + rr + '.00 cm');
  }
  function polys(r, p) {
    var n = 3 + Math.floor(r() * 6), L = 22, s = 250, rot = 0, out = '', i, j, a, d;
    for (i = 0; i < L; i++) {
      d = '';
      for (j = 0; j < n; j++) {
        a = rot + j * 2 * Math.PI / n - Math.PI / 2;
        d += (j ? 'L' : 'M') + f(400 + s * Math.cos(a)) + ' ' + f(300 + s * Math.sin(a));
      }
      out += '<path d="' + d + 'Z" fill="' + p[i % p.length] + '" fill-opacity=".07" stroke="' + p[i % p.length] + '" stroke-width="1.8"/>';
      s *= 0.9; rot += 0.12;
    }
    return out + pt(400, 300, p[1], 'O') + measure('n = ' + n + ',  θ = 6.88°');
  }
  function star(r, p) {
    var n = 7 + Math.floor(r() * 8), k = 2 + Math.floor(r() * 3), out = '', layer, j, a, d, s;
    for (layer = 0; layer < 3; layer++) {
      s = 250 - layer * 70; d = '';
      for (j = 0; j <= n; j++) {
        a = (j * k % n) * 2 * Math.PI / n - Math.PI / 2 + layer * 0.2;
        d += (j ? 'L' : 'M') + f(400 + s * Math.cos(a)) + ' ' + f(300 + s * Math.sin(a));
      }
      out += '<path d="' + d + '" fill="' + p[layer] + '" fill-opacity=".12" stroke="' + p[layer] + '" stroke-width="2"/>';
    }
    return out + pt(400, 50, p[3], 'A') + measure('{' + n + '/' + k + '}  star polygon');
  }
  function rose(r, p) {
    var kn = 2 + Math.floor(r() * 6), kd = 1 + Math.floor(r() * 3), k = kn / kd, d = '', t, rr, A = 240;
    for (t = 0; t <= Math.PI * 2 * kd; t += 0.012) {
      rr = A * Math.cos(k * t);
      d += (d ? 'L' : 'M') + f(400 + rr * Math.cos(t)) + ' ' + f(300 + rr * Math.sin(t));
    }
    return '<path d="' + d + 'Z" fill="' + p[2] + '" fill-opacity=".18" stroke="' + p[0] + '" stroke-width="2"/>' +
      '<circle cx="400" cy="300" r="' + A + '" fill="none" stroke="' + p[1] + '" stroke-dasharray="3 5"/>' +
      pt(400, 300, p[1], 'O') + measure('r = ' + A / 10 + ' cos(' + kn + '/' + kd + ' θ)');
  }
  function tess(r, p) {
    var out = '', s = 60, h = s * Math.sqrt(3) / 2, row, col, x, y, up, c;
    for (row = 0; row < 12; row++) {
      for (col = -1; col < 28; col++) {
        x = col * s / 2; y = row * h;
        up = (row + col) % 2 === 0;
        c = p[Math.floor(Math.abs(Math.sin((row * 7 + Math.abs(col - 13) * 13) * (1 + r() * 0.0001))) * p.length) % p.length];
        out += '<path d="' + (up ? 'M' + f(x) + ' ' + f(y + h) + 'L' + f(x + s / 2) + ' ' + f(y) + 'L' + f(x + s) + ' ' + f(y + h) :
          'M' + f(x) + ' ' + f(y) + 'L' + f(x + s) + ' ' + f(y) + 'L' + f(x + s / 2) + ' ' + f(y + h)) +
          'Z" fill="' + c + '" fill-opacity="' + (0.2 + ((row * col + 99) % 5) * 0.15).toFixed(2) + '" stroke="#fff" stroke-width="1.5"/>';
      }
    }
    return out + measure('Reflect: line AB');
  }
  var FN = [rosette, spiro, polys, star, rose, tess];
  function svg(seed, variant) {
    var r = rng(seed + 7), p = PALS[seed % PALS.length];
    var fn = FN[(variant === undefined ? seed : variant) % FN.length];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">' + bg() + fn(r, p) + '</svg>';
  }
  function uri(seed, variant) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(seed, variant)); }
  return { svg: svg, uri: uri };
})();

/* ---------------- Demo: ฐานข้อมูลจำลองในเบราว์เซอร์ ---------------- */
var Demo = (function () {
  'use strict';
  var KEY = 'gsp_demo_db_v1';
  var PASS = 'demo1234';
  var db = null;

  var SCHOOLS = ['โรงเรียนบ้านวงกลม', 'โรงเรียนบ้านสามเหลี่ยม', 'โรงเรียนบ้านเส้นขนาน', 'โรงเรียนบ้านมุมฉาก',
    'โรงเรียนบ้านพาราโบลา', 'โรงเรียนบ้านจุดศูนย์กลาง', 'โรงเรียนบ้านรัศมี', 'โรงเรียนบ้านเส้นสัมผัส',
    'โรงเรียนบ้านคอร์ด', 'โรงเรียนบ้านเวกเตอร์'];
  var FIRST_B = ['ธนกฤต', 'ภูมิพัฒน์', 'กิตติพัฒน์', 'ณัฐวุฒิ', 'ปัณณวัฒน์', 'ธีรภัทร', 'อนุชา', 'วชิรวิทย์', 'ศุภณัฐ', 'พีรพล'];
  var FIRST_G = ['กนกพร', 'ณัฐธิดา', 'พิมพ์ชนก', 'ปุณยวีร์', 'ชนิกานต์', 'อรปรียา', 'สุพิชญา', 'ธัญชนก', 'วรัญญา', 'ภัทรนันท์'];
  var LAST = ['ใจดี', 'มีสุข', 'ศรีสว่าง', 'บุญมา', 'แก้วประเสริฐ', 'ทองดี', 'สมบูรณ์', 'พรหมวงศ์', 'คำแสน', 'ชัยมงคล', 'ดวงแก้ว', 'สายทอง'];
  var COACH = ['นางสาวสุนิสา วงศ์ใหญ่', 'นายประเสริฐ คำดี', 'นางวิไลวรรณ ศรีสุข', 'นายอนันต์ บุญเรือง', 'นางสาวจิราพร ทองคำ', 'นายสมชาย ใจมั่น', 'นางกาญจนา แสงทอง', 'นายวีระ ชาญชัย'];
  var TITLES = ['ดอกไม้บานจากการหมุนวงกลม', 'กังหันลมเรขาคณิต', 'ลายผ้าไหมด้วยการสะท้อน', 'ดาวประดับเพดานโบสถ์',
    'ผีเสื้อสมมาตร', 'นาฬิกาแห่งมุม', 'เกล็ดหิมะหกเหลี่ยม', 'ว่าวอีสานจากรูปสี่เหลี่ยม', 'โคมไฟล้านนาด้วยการหมุน',
    'ลวดลายจักสานไม้ไผ่', 'ทุ่งทานตะวันเรขา', 'วงล้อแห่งรูปหลายเหลี่ยม', 'ปลาตะเพียนสานด้วยการเลื่อนขนาน',
    'พัดคลี่ด้วยมุมที่เท่ากัน', 'ลายกระเบื้องเทสเซลเลชัน', 'บัวบานกลางสระ', 'รถไฟจำลองการแปลงทางเรขาคณิต',
    'มณฑปจากรูปสามเหลี่ยม', 'ลายขิดเรขาคณิต', 'ดอกลำดวนบานด้วยวงกลม'];
  var THEMES = {
    2566: 'สร้างสรรค์ลวดลายจากการหมุนและการสะท้อนของรูปเรขาคณิต',
    2567: 'ลวดลายไทยร่วมสมัยด้วยวงกลมและรูปหลายเหลี่ยม',
    2568: 'ภูมิปัญญาท้องถิ่นผ่านการแปลงทางเรขาคณิต (เลื่อนขนาน หมุน สะท้อน)'
  };

  function seed() {
    var r = (function () { var s = 42; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    function pick(a) { return a[Math.floor(r() * a.length)]; }
    function student() { return (r() > 0.5 ? 'เด็กชาย' + pick(FIRST_B) : 'เด็กหญิง' + pick(FIRST_G)) + ' ' + pick(LAST); }
    var comps = [], results = [], years = [2566, 2567, 2568], levels = ['ป.1-3', 'ป.4-6'], ti = 0, artSeed = 1;
    var now = new Date().toISOString();
    years.forEach(function (y, yi) {
      levels.forEach(function (lv, li) {
        var cid = 'c' + y + (li + 1);
        comps.push({
          id: cid, year: y, level: lv, stage: 'ระดับเขตพื้นที่การศึกษา',
          title: 'การแข่งขันสร้างสรรค์ผลงานคณิตศาสตร์โดยใช้โปรแกรม GSP ระดับชั้น ' + lv,
          date: (y - 543) + '-11-' + (12 + yi * 3 + li), venue: 'ศูนย์สอบตัวอย่าง (ข้อมูลสาธิต)',
          theme: THEMES[y], description: 'ใช้เวลาแข่งขัน 3 ชั่วโมง ทีมละ 2 คน สร้างผลงานจากโจทย์ที่กำหนดด้วยโปรแกรม GSP พร้อมนำเสนอแนวคิดต่อคณะกรรมการ',
          files: [
            { id: 'f' + cid + 'a', name: 'โจทย์การแข่งขัน_' + lv + '_' + y + '.pdf', mime: 'application/pdf', size: 245000 + yi * 3100, kind: 'โจทย์' },
            { id: 'f' + cid + 'b', name: 'เกณฑ์การให้คะแนน_' + y + '.pdf', mime: 'application/pdf', size: 118000, kind: 'เกณฑ์' },
            { id: 'f' + cid + 'c', name: 'ไฟล์ตั้งต้น_' + lv + '_' + y + '.gsp', mime: 'application/octet-stream', size: 42000, kind: 'ไฟล์ตั้งต้น' }
          ],
          published: true, createdAt: now, updatedAt: now
        });
        var n = 6 + Math.floor(r() * 3), score = 96 - r() * 3, i;
        for (i = 1; i <= n; i++) {
          var sc = Math.round(score * 100) / 100;
          var title = TITLES[ti % TITLES.length]; ti++;
          var s1 = artSeed++;
          results.push({
            id: 'r' + y + (li + 1) + i, competitionId: cid, rank: i, school: SCHOOLS[(yi * 3 + li * 5 + i * 7) % SCHOOLS.length],
            students: [student(), student()], coaches: r() > 0.4 ? [pick(COACH), pick(COACH)] : [pick(COACH)],
            score: sc, medal: '', title: title, advance: i <= 1,
            description: 'ผลงาน "' + title + '" ใช้การ' + pick(['หมุนรอบจุด', 'สะท้อนข้ามเส้นตรง', 'เลื่อนขนานตามเวกเตอร์', 'ย่อขยายจากจุดศูนย์กลาง']) +
              'ร่วมกับการสร้างวงกลมและรูปหลายเหลี่ยมด้านเท่า นักเรียนอธิบายขั้นตอนการสร้างได้ชัดเจน มีการใช้ Action Button และ Animation ประกอบการนำเสนอ\n\n(ข้อมูลตัวอย่างสำหรับสาธิตระบบ)',
            images: [
              { id: 'i' + s1 + 'a', name: 'ผลงาน.png', mime: 'image/svg+xml', url: 'art:' + s1 + ':' + (s1 % 6) },
              { id: 'i' + s1 + 'b', name: 'ขั้นตอนการสร้าง.png', mime: 'image/svg+xml', url: 'art:' + (s1 + 11) + ':' + ((s1 + 2) % 6) },
              { id: 'i' + s1 + 'c', name: 'ภาพขยาย.png', mime: 'image/svg+xml', url: 'art:' + (s1 + 23) + ':' + ((s1 + 4) % 6) }
            ],
            files: [
              { id: 'g' + s1, name: title.replace(/\s/g, '_') + '.gsp', mime: 'application/octet-stream', size: 30000 + Math.floor(r() * 90000), kind: 'ไฟล์ GSP' },
              { id: 'p' + s1, name: 'แนวคิดและขั้นตอนการสร้าง.pdf', mime: 'application/pdf', size: 150000 + Math.floor(r() * 400000), kind: 'เอกสาร' }
            ],
            views: Math.floor(r() * 400) + (n - i) * 30, downloads: Math.floor(r() * 120),
            published: true, createdAt: now, updatedAt: now
          });
          score -= 1.5 + r() * 4.5;
        }
      });
    });
    return {
      settings: {
        siteTitle: CONFIG.SYSTEM_NAME,
        siteSubtitle: 'คลังผลงานนักเรียนที่ได้รับรางวัล พร้อมโจทย์และไฟล์ GSP ให้ครูและนักเรียนดาวน์โหลดไปฝึกทำ',
        announcement: 'ประกาศผลการแข่งขัน ปีการศึกษา 2568 แล้ว — ขอแสดงความยินดีกับทุกทีม',
        goldMin: 80, silverMin: 70, bronzeMin: 60,
        levels: 'ป.1-3,ป.4-6',
        stages: 'ระดับเขตพื้นที่การศึกษา,ระดับภาค,ระดับชาติ',
        footerText: 'พัฒนาโดย นายชิติพัทธ์ นิลวรรณ ตำแหน่ง ครู',
        devName: 'นายชิติพัทธ์ นิลวรรณ',
        devPosition: 'ครู',
        devOrg: '',
        devPhotoUrl: '',
        devBio: 'ครูคณิตศาสตร์ ผู้พัฒนาระบบสารสนเทศเพื่อการศึกษาด้วย Google Apps Script',
        devGithub: 'krubankssk3',
        devEmail: '',
        devLine: '',
        devFacebook: '',
        publicUrl: '',
        reportOrg: 'คณะกรรมการตัดสินการแข่งขัน (ข้อมูลสาธิต)',
        signers: ' | ประธานคณะกรรมการ\n | กรรมการ\n | กรรมการ\n | กรรมการและเลขานุการ'
      },
      competitions: comps, results: results,
      logs: [{ at: now, action: 'setup', detail: 'สร้างฐานข้อมูลตัวอย่าง' }]
    };
  }

  function load() {
    if (db) return db;
    db = U.store(KEY) || seed();
    var def = seed().settings;
    Object.keys(def).forEach(function (k) { if (db.settings[k] === undefined) db.settings[k] = def[k]; });
    return db;
  }
  function save() {
    if (!U.store(KEY, db)) { /* ที่เก็บเต็มหรือถูกบล็อก — ทำงานต่อในหน่วยความจำ */ }
  }
  function log(action, detail) {
    db.logs.unshift({ at: new Date().toISOString(), action: action, detail: detail });
    if (db.logs.length > 200) db.logs.length = 200;
  }
  function findIdx(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return i; return -1; }
  function need(token) { if (token !== 'demo-token') { var e = new Error('กรุณาเข้าสู่ระบบ'); e.code = 'AUTH'; throw e; } }

  var H = {
    getPublic: function () {
      var pubC = db.competitions.filter(function (c) { return c.published; });
      var ids = {}; pubC.forEach(function (c) { ids[c.id] = 1; });
      return { settings: db.settings, competitions: pubC, results: db.results.filter(function (r) { return r.published && ids[r.competitionId]; }) };
    },
    hit: function (d) {
      var i = findIdx(db.results, d.id);
      if (i > -1) { if (d.type === 'download') db.results[i].downloads++; else db.results[i].views++; }
      return true;
    },
    login: function (d) {
      if (d.password !== (db.settings._pass || PASS)) throw new Error('รหัสผ่านไม่ถูกต้อง');
      log('login', 'เข้าสู่ระบบ');
      return { token: 'demo-token', name: 'กรรมการ (สาธิต)' };
    },
    logout: function () { return true; },
    getAdmin: function (d, t) { need(t); var o = U.clone(db); delete o.settings._pass; return o; },
    saveCompetition: function (d, t) {
      need(t);
      var c = d, now = new Date().toISOString(), i = findIdx(db.competitions, c.id);
      c.year = Number(c.year); c.updatedAt = now;
      if (i > -1) { db.competitions[i] = c; log('edit', 'แก้ไขรายการแข่งขัน ' + c.level + ' ปี ' + c.year); }
      else { c.id = U.uid('c'); c.createdAt = now; db.competitions.push(c); log('add', 'เพิ่มรายการแข่งขัน ' + c.level + ' ปี ' + c.year); }
      return c;
    },
    deleteCompetition: function (d, t) {
      need(t);
      var has = db.results.some(function (r) { return r.competitionId === d.id; });
      if (has) throw new Error('ยังมีผลการแข่งขันในรายการนี้ — ลบผลการแข่งขันก่อน');
      var i = findIdx(db.competitions, d.id);
      if (i > -1) { log('delete', 'ลบรายการแข่งขัน ' + db.competitions[i].title); db.competitions.splice(i, 1); }
      return true;
    },
    saveResult: function (d, t) {
      need(t);
      var r = d, now = new Date().toISOString(), i = findIdx(db.results, r.id);
      r.rank = Number(r.rank); r.updatedAt = now;
      if (i > -1) { r.views = db.results[i].views; r.downloads = db.results[i].downloads; db.results[i] = r; log('edit', 'แก้ไขผลงาน "' + r.title + '"'); }
      else { r.id = U.uid('r'); r.createdAt = now; r.views = 0; r.downloads = 0; db.results.push(r); log('add', 'เพิ่มผลงาน "' + r.title + '" อันดับ ' + r.rank); }
      return r;
    },
    deleteResult: function (d, t) {
      need(t);
      var i = findIdx(db.results, d.id);
      if (i > -1) { log('delete', 'ลบผลงาน "' + db.results[i].title + '"'); db.results.splice(i, 1); }
      return true;
    },
    setPublished: function (d, t) {
      need(t);
      var arr = d.type === 'competition' ? db.competitions : db.results, i = findIdx(arr, d.id);
      if (i > -1) { arr[i].published = !!d.published; log('publish', (d.published ? 'เผยแพร่ ' : 'ซ่อน ') + (arr[i].title || arr[i].id)); }
      return true;
    },
    bulkImport: function (d, t) {
      need(t);
      var now = new Date().toISOString();
      d.rows.forEach(function (r) {
        r.id = U.uid('r'); r.competitionId = d.competitionId; r.createdAt = now; r.updatedAt = now;
        r.views = 0; r.downloads = 0; r.images = []; r.files = []; r.published = !!d.published;
        db.results.push(r);
      });
      log('import', 'นำเข้าผลการแข่งขัน ' + d.rows.length + ' รายการ');
      return { count: d.rows.length };
    },
    uploadFile: function (d, t) {
      need(t);
      var isImg = /^image\//.test(d.mime);
      return { id: U.uid('f'), name: d.name, mime: d.mime, size: d.size, kind: d.kind || '', url: isImg ? 'data:' + d.mime + ';base64,' + d.data : '' };
    },
    deleteFile: function (d, t) { need(t); return true; },
    saveSettings: function (d, t) {
      need(t);
      var p = db.settings._pass;
      db.settings = d; if (p) db.settings._pass = p;
      log('settings', 'บันทึกการตั้งค่า');
      return d;
    },
    changePassword: function (d, t) {
      need(t);
      if (d.oldPassword !== (db.settings._pass || PASS)) throw new Error('รหัสผ่านเดิมไม่ถูกต้อง');
      db.settings._pass = d.newPassword; log('settings', 'เปลี่ยนรหัสผ่าน');
      return true;
    },
    reorderRanks: function (d, t) {
      need(t);
      (d.ranks || []).forEach(function (x) { var i = findIdx(db.results, x.id); if (i > -1) db.results[i].rank = Number(x.rank); });
      log('edit', 'เรียงอันดับใหม่จากคะแนน ' + (d.ranks || []).length + ' รายการ');
      return true;
    },
    resetDemo: function () { db = seed(); return true; }
  };

  function handle(action, data, token) {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          load();
          if (!H[action]) throw new Error('ไม่รู้จักคำสั่ง ' + action);
          var out = H[action](data ? U.clone(data) : {}, token);
          if (action !== 'getPublic' && action !== 'getAdmin') save();
          resolve(U.clone(out));
        } catch (e) { reject(e); }
      }, action === 'uploadFile' ? 600 : 220);
    });
  }
  return { handle: handle, PASS: PASS, reset: function () { U.store(KEY, null); db = null; } };
})();

/* ---------------- API ---------------- */
var API = (function () {
  'use strict';
  var DEMO = !CONFIG.API_URL || CONFIG.DEMO === true;
  var TKEY = 'gsp_admin_token';
  var token = '';
  try { token = sessionStorage.getItem(TKEY) || ''; } catch (e) {}

  function remote(action, data) {
    return fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: token, data: data || {} })
    }).then(function (r) {
      if (!r.ok) throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ (' + r.status + ')');
      return r.json();
    }).then(function (res) {
      if (!res.ok) { var e = new Error(res.error || 'เกิดข้อผิดพลาด'); e.code = res.code; throw e; }
      return res.data;
    });
  }
  function call(action, data) { return DEMO ? Demo.handle(action, data, token) : remote(action, data); }
  function setToken(t) {
    token = t || '';
    try { if (t) sessionStorage.setItem(TKEY, t); else sessionStorage.removeItem(TKEY); } catch (e) {}
  }
  /* แปลงไฟล์เป็น base64 (ย่อรูปใหญ่ให้อัตโนมัติ) แล้วอัปโหลด */
  function readB64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
      fr.onerror = function () { reject(new Error('อ่านไฟล์ไม่ได้')); };
      fr.readAsDataURL(file);
    });
  }
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size < 1.5 * 1048576) return resolve(null);
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 2000, w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var data = c.toDataURL('image/jpeg', 0.9);
        resolve({ data: data.split(',')[1], mime: 'image/jpeg', size: Math.round(data.length * 0.75), name: file.name.replace(/\.\w+$/, '.jpg') });
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  function upload(file, folder, kind) {
    if (!/^image\//.test(file.type) && (CONFIG.ALLOWED_EXT || []).indexOf(U.ext(file.name)) < 0) {
      return Promise.reject(new Error('ไม่รองรับไฟล์ .' + U.ext(file.name) + ' (' + file.name + ')'));
    }
    if (file.size > CONFIG.MAX_UPLOAD_MB * 1048576) return Promise.reject(new Error('ไฟล์ ' + file.name + ' ใหญ่เกิน ' + CONFIG.MAX_UPLOAD_MB + ' MB'));
    return shrinkImage(file).then(function (sm) {
      if (sm) return { name: sm.name, mime: sm.mime, size: sm.size, data: sm.data };
      /* ไฟล์ .gsp เบราว์เซอร์ไม่รู้จักชนิด → บังคับเป็น octet-stream เพื่อให้ดาวน์โหลดเป็นไฟล์เดิมเสมอ */
      var mime = U.isGsp(file.name) ? 'application/octet-stream' : (file.type || 'application/octet-stream');
      return readB64(file).then(function (b) { return { name: file.name, mime: mime, size: file.size, data: b }; });
    }).then(function (p) {
      p.folder = folder || 'files'; p.kind = kind || '';
      return call('uploadFile', p);
    });
  }
  return { isDemo: DEMO, call: call, setToken: setToken, getToken: function () { return token; }, upload: upload, resetDemo: function () { Demo.reset(); } };
})();
