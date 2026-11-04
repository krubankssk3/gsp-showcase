/* =========================================================
   charts.js — กราฟ SVG สไตล์ The Geometer's Sketchpad (ES5)
   ใช้บนพื้นหลังโทนเข้ม (.bp) — มีเส้นสร้าง จุด และค่าการวัดแบบ GSP
   ========================================================= */
var Charts = (function () {
  'use strict';
  var uid = 0;
  var C = {
    gold: '#f6c445', silver: '#b9c3d6', bronze: '#e0915c', none: '#6f7a96',
    blue: '#5b8cff', red: '#ff6b6b', green: '#3ddc97', cyan: '#46d9ff', violet: '#b28bff',
    ink: '#e8edf8', dim: '#8d99b8', grid: 'rgba(140,165,220,.16)'
  };
  function f(n) { return Math.round(n * 10) / 10; }
  function esc(s) { return U.esc(s); }
  function glowDef(id, color) {
    return '<filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  }
  function letter(i) { return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(i % 26) + (i >= 26 ? Math.floor(i / 26) : ''); }
  function pt(x, y, color, gid, label, title) {
    return '<g>' + (title ? '<title>' + esc(title) + '</title>' : '') +
      '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="5.5" fill="' + color + '" stroke="#0d1426" stroke-width="2" filter="url(#' + gid + ')"/>' +
      (label ? '<text x="' + f(x + 7) + '" y="' + f(y - 9) + '" font-family="Georgia,serif" font-style="italic" font-size="13" fill="' + C.ink + '">' + esc(label) + '</text>' : '') + '</g>';
  }

  /* ---------- โดนัท = ไม้โปรแทรกเตอร์ ---------- */
  function donut(segs, o) {
    o = o || {};
    var id = 'gd' + (++uid), W = 300, cx = 150, cy = 150, R = 92, total = 0, a0 = -Math.PI / 2, out = '', marks = '', i;
    segs.forEach(function (s) { total += s.value; });
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 30) + '" fill="none" stroke="' + C.grid + '" stroke-dasharray="3 5"/>';
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="22"/>';
    for (i = 0; i < 36; i++) {
      var ta = i * Math.PI / 18, r1 = R + 15, r2 = R + (i % 3 ? 19 : 24);
      marks += '<line x1="' + f(cx + r1 * Math.cos(ta)) + '" y1="' + f(cy + r1 * Math.sin(ta)) + '" x2="' + f(cx + r2 * Math.cos(ta)) + '" y2="' + f(cy + r2 * Math.sin(ta)) + '" stroke="' + C.grid + '"/>';
    }
    out += marks;
    if (!total) {
      out += '<text x="150" y="155" text-anchor="middle" fill="' + C.dim + '" font-size="14">ไม่มีข้อมูล</text>';
      return wrap(W, W, id, out, o);
    }
    var pts = '', labels = '';
    segs.forEach(function (s, k) {
      if (!s.value) return;
      var ang = s.value / total * Math.PI * 2, a1 = a0 + ang;
      if (ang >= Math.PI * 2 - 1e-6) {
        out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + s.color + '" stroke-width="22" filter="url(#' + id + ')"><title>' + esc(s.label + ': ' + s.value) + '</title></circle>';
      } else {
        var large = ang > Math.PI ? 1 : 0;
        out += '<path d="M' + f(cx + R * Math.cos(a0)) + ' ' + f(cy + R * Math.sin(a0)) + 'A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + f(cx + R * Math.cos(a1)) + ' ' + f(cy + R * Math.sin(a1)) +
          '" fill="none" stroke="' + s.color + '" stroke-width="22" filter="url(#' + id + ')"><title>' + esc(s.label + ': ' + s.value) + '</title></path>';
      }
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + (R - 11) * Math.cos(a0)) + '" y2="' + f(cy + (R - 11) * Math.sin(a0)) + '" stroke="rgba(232,237,248,.35)" stroke-dasharray="2 3"/>';
      pts += pt(cx + R * Math.cos(a0), cy + R * Math.sin(a0), '#fff', id, letter(k));
      var mid = a0 + ang / 2, lr = R + 42;
      labels += '<text x="' + f(cx + lr * Math.cos(mid)) + '" y="' + f(cy + lr * Math.sin(mid) + 4) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="' + s.color + '">' + (ang * 180 / Math.PI).toFixed(1) + '°</text>';
      a0 = a1;
    });
    out += pts + labels + pt(cx, cy, C.cyan, id, 'O');
    out += '<text x="' + cx + '" y="' + (cy + 30) + '" text-anchor="middle" font-family="Bai Jamjuree,sans-serif" font-size="26" font-weight="700" fill="' + C.ink + '">' + total + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 46) + '" text-anchor="middle" font-size="11" fill="' + C.dim + '">' + esc(o.unit || 'รายการ') + '</text>';
    return wrap(W, W, id, out, o);
  }

  /* ---------- กราฟเส้นบนระนาบพิกัด ---------- */
  function line(o) {
    var id = 'gl' + (++uid), W = o.w || 620, H = o.h || 300, pl = 46, pr = 24, pt0 = 26, pb = 40;
    var n = o.labels.length, yMin = o.yMin, yMax = o.yMax, out = '', i;
    var iw = W - pl - pr, ih = H - pt0 - pb;
    function X(i) { return pl + 36 + (n === 1 ? (iw - 72) / 2 : i * (iw - 72) / (n - 1)); }
    function Y(v) { return pt0 + ih - (v - yMin) / (yMax - yMin) * ih; }
    var step = o.yStep || Math.ceil((yMax - yMin) / 5);
    for (var v = yMin; v <= yMax + 1e-6; v += step) {
      out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f(Y(v)) + '" y2="' + f(Y(v)) + '" stroke="' + C.grid + '" stroke-dasharray="3 4"/>' +
        '<text x="' + (pl - 8) + '" y="' + f(Y(v) + 4) + '" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="10.5" fill="' + C.dim + '">' + v + '</text>';
    }
    out += '<path d="M' + pl + ' ' + (pt0 - 12) + 'V' + (pt0 + ih) + 'H' + (W - pr + 10) + '" fill="none" stroke="' + C.dim + '" stroke-width="1.3"/>' +
      '<path d="M' + (pl - 4) + ' ' + (pt0 - 6) + 'L' + pl + ' ' + (pt0 - 14) + 'L' + (pl + 4) + ' ' + (pt0 - 6) + '" fill="none" stroke="' + C.dim + '"/>' +
      '<path d="M' + (W - pr + 4) + ' ' + (pt0 + ih - 4) + 'L' + (W - pr + 12) + ' ' + (pt0 + ih) + 'L' + (W - pr + 4) + ' ' + (pt0 + ih + 4) + '" fill="none" stroke="' + C.dim + '"/>';
    for (i = 0; i < n; i++) {
      out += '<text x="' + f(X(i)) + '" y="' + (H - 16) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11.5" fill="' + C.ink + '">' + esc(o.labels[i]) + '</text>';
    }
    var li = 0;
    o.series.forEach(function (s) {
      var d = '', area = '', has = false;
      s.values.forEach(function (val, i2) {
        if (val === null || val === undefined || isNaN(val)) return;
        d += (has ? 'L' : 'M') + f(X(i2)) + ' ' + f(Y(val)); has = true;
      });
      if (!has) return;
      if (s.fill) {
        var first = -1, last = -1;
        s.values.forEach(function (val, i2) { if (val !== null && !isNaN(val)) { if (first < 0) first = i2; last = i2; } });
        area = '<path d="' + d + 'L' + f(X(last)) + ' ' + (pt0 + ih) + 'L' + f(X(first)) + ' ' + (pt0 + ih) + 'Z" fill="' + s.color + '" fill-opacity=".10"/>';
      }
      out += area + '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linejoin="round" filter="url(#' + id + ')"' + (s.dash ? ' stroke-dasharray="6 5"' : '') + '/>';
      s.values.forEach(function (val, i2) {
        if (val === null || val === undefined || isNaN(val)) return;
        out += pt(X(i2), Y(val), s.color, id, s.points ? letter(li++) : '', s.name + ' ปี ' + o.labels[i2] + ': ' + val);
        if (s.showValue) out += '<text x="' + f(X(i2)) + '" y="' + f(Y(val) + 20) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="' + s.color + '">' + val + '</text>';
      });
    });
    return wrap(W, H, id, out, o);
  }

  /* ---------- แท่งซ้อน ---------- */
  function stack(o) {
    var id = 'gs' + (++uid), W = o.w || 620, H = o.h || 280, pl = 40, pr = 16, pt0 = 30, pb = 38;
    var n = o.labels.length, iw = W - pl - pr, ih = H - pt0 - pb, out = '', max = 1, i;
    for (i = 0; i < n; i++) {
      var t = 0; o.stacks.forEach(function (s) { t += s.values[i] || 0; }); if (t > max) max = t;
    }
    max = Math.ceil(max / 5) * 5 || 5;
    for (var g = 0; g <= 5; g++) {
      var gy = pt0 + ih - g / 5 * ih;
      out += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f(gy) + '" y2="' + f(gy) + '" stroke="' + C.grid + '" stroke-dasharray="3 4"/>' +
        '<text x="' + (pl - 8) + '" y="' + f(gy + 4) + '" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="10.5" fill="' + C.dim + '">' + Math.round(max * g / 5) + '</text>';
    }
    var bw = Math.min(56, iw / n * 0.55);
    for (i = 0; i < n; i++) {
      var cx = pl + (i + 0.5) * iw / n, y = pt0 + ih, tot = 0;
      o.stacks.forEach(function (s) {
        var v = s.values[i] || 0; if (!v) return;
        var h = v / max * ih; y -= h; tot += v;
        out += '<rect x="' + f(cx - bw / 2) + '" y="' + f(y) + '" width="' + f(bw) + '" height="' + f(h) + '" rx="3" fill="' + s.color + '" fill-opacity=".85" stroke="#0d1426" stroke-width="1.5"><title>' + esc(s.name + ' ปี ' + o.labels[i] + ': ' + v) + '</title></rect>';
      });
      out += '<text x="' + f(cx) + '" y="' + f(y - 8) + '" text-anchor="middle" font-family="Bai Jamjuree,sans-serif" font-weight="700" font-size="14" fill="' + C.ink + '">' + tot + '</text>' +
        '<text x="' + f(cx) + '" y="' + (H - 14) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="11.5" fill="' + C.ink + '">' + esc(o.labels[i]) + '</text>';
    }
    out += '<path d="M' + pl + ' ' + (pt0 + ih) + 'H' + (W - pr) + '" stroke="' + C.dim + '"/>';
    return wrap(W, H, id, out, o);
  }

  /* ---------- เส้นจำนวน: การกระจายคะแนน ---------- */
  function numberLine(items, o) {
    o = o || {};
    var id = 'gn' + (++uid), W = o.w || 620, H = 120, pl = 24, pr = 24, y = 70, min = o.min || 50, max = o.max || 100, out = '';
    function X(v) { return pl + (v - min) / (max - min) * (W - pl - pr); }
    out += '<line x1="' + (pl - 10) + '" x2="' + (W - pr + 10) + '" y1="' + y + '" y2="' + y + '" stroke="' + C.dim + '" stroke-width="1.4"/>';
    for (var v = min; v <= max; v += 5) {
      out += '<line x1="' + f(X(v)) + '" x2="' + f(X(v)) + '" y1="' + (y - (v % 10 ? 4 : 7)) + '" y2="' + (y + (v % 10 ? 4 : 7)) + '" stroke="' + C.dim + '"/>' +
        (v % 10 ? '' : '<text x="' + f(X(v)) + '" y="' + (y + 24) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="10.5" fill="' + C.dim + '">' + v + '</text>');
    }
    (o.bands || []).forEach(function (b) {
      var b0 = Math.max(min, b.from), b1 = Math.min(max, b.to);
      if (b1 <= b0) return;
      out += '<rect x="' + f(X(b0)) + '" y="' + (y - 2) + '" width="' + f(X(b1) - X(b0)) + '" height="4" fill="' + b.color + '" opacity=".55"/>';
    });
    var used = {};
    items.forEach(function (it) {
      var x = X(Math.max(min, Math.min(max, it.v))), lvl = 0, key;
      while (used[(key = Math.round(x / 14) + '_' + lvl)]) lvl++;
      used[key] = 1;
      var py = y - 16 - lvl * 16;
      out += '<line x1="' + f(x) + '" x2="' + f(x) + '" y1="' + py + '" y2="' + y + '" stroke="' + it.color + '" stroke-opacity=".4" stroke-dasharray="2 2"/>' +
        pt(x, py, it.color, id, '', it.title) +
        '<text x="' + f(x) + '" y="' + (py + 3.5) + '" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0d1426" pointer-events="none">' + esc(it.label) + '</text>';
    });
    return wrap(W, H, id, out, o);
  }

  function wrap(W, H, id, body, o) {
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o && o.aria || 'แผนภูมิ') + '"><defs>' + glowDef(id) + '</defs>' + body + '</svg>';
  }
  function medalColor(m) { return m === 'ทอง' ? C.gold : m === 'เงิน' ? C.silver : m === 'ทองแดง' ? C.bronze : C.none; }
  return { donut: donut, line: line, stack: stack, numberLine: numberLine, C: C, medalColor: medalColor };
})();

/* ---------------- Stats: คำนวณสถิติ (ใช้ร่วม Public/Admin) ---------------- */
var Stats = (function () {
  'use strict';
  function blank() { return { teams: 0, schools: {}, students: 0, coaches: {}, sum: 0, nScore: 0, max: null, min: null, medals: { 'ทอง': 0, 'เงิน': 0, 'ทองแดง': 0, 'เข้าร่วม': 0 }, gsp: 0, files: 0, views: 0, downloads: 0, advance: [] }; }
  function add(o, r, m) {
    o.teams++;
    o.schools[r.school] = 1;
    o.students += (r.students || []).length;
    (r.coaches || []).forEach(function (c) { o.coaches[c] = 1; });
    var s = Number(r.score);
    if (r.score !== '' && r.score !== null && r.score !== undefined && !isNaN(s)) {
      o.sum += s; o.nScore++;
      if (o.max === null || s > o.max) o.max = s;
      if (o.min === null || s < o.min) o.min = s;
    }
    if (m && o.medals[m] !== undefined) o.medals[m]++;
    (r.files || []).forEach(function (f) { o.files++; if (U.isGsp(f.name)) o.gsp++; });
    o.views += Number(r.views) || 0; o.downloads += Number(r.downloads) || 0;
    if (r.advance) o.advance.push(r);
  }
  function fin(o) {
    o.schoolCount = Object.keys(o.schools).length;
    o.coachCount = Object.keys(o.coaches).length;
    o.avg = o.nScore ? Math.round(o.sum / o.nScore * 100) / 100 : null;
    return o;
  }
  function compute(comps, results, st) {
    var cm = {}, all = blank(), years = {}, ylist = [];
    comps.forEach(function (c) { cm[c.id] = c; });
    comps.forEach(function (c) {
      (c.files || []).forEach(function (f) { if (U.isGsp(f.name)) all.gsp++; });
    });
    results.forEach(function (r) {
      var c = cm[r.competitionId]; if (!c) return;
      var m = U.medalOf(r, st);
      add(all, r, m);
      if (!years[c.year]) { years[c.year] = blank(); years[c.year].year = Number(c.year); years[c.year].levels = {}; ylist.push(years[c.year]); }
      var y = years[c.year]; add(y, r, m);
      var key = c.id;
      if (!y.levels[key]) { y.levels[key] = blank(); y.levels[key].comp = c; y.levels[key].rows = []; }
      add(y.levels[key], r, m); y.levels[key].rows.push(r);
    });
    ylist.sort(function (a, b) { return a.year - b.year; });
    ylist.forEach(function (y) {
      fin(y);
      y.levelList = Object.keys(y.levels).map(function (k) {
        var l = fin(y.levels[k]);
        l.rows.sort(function (a, b) { return a.rank - b.rank; });
        l.champion = l.rows[0];
        return l;
      }).sort(function (a, b) { return String(a.comp.level).localeCompare(String(b.comp.level)) || String(a.comp.stage).localeCompare(String(b.comp.stage)); });
    });
    fin(all);
    all.years = ylist;
    return all;
  }
  function delta(cur, prev, digits) {
    if (prev === null || prev === undefined || cur === null || cur === undefined) return '';
    var d = cur - prev; if (!d) return '<span class="delta">±0</span>';
    var t = (d > 0 ? '+' : '') + (digits ? d.toFixed(digits) : d);
    return '<span class="delta ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : '▼ ') + t + '</span>';
  }
  return { compute: compute, delta: delta };
})();
