/* =========================================================
   report.js — รายงานพร้อมพิมพ์ / บันทึกเป็น PDF + QR Code (ES5)
   - ประกาศผลการแข่งขัน (รายรายการ หรือทั้งปี)
   - รายงานผลงานรายโรงเรียน (พร้อม QR ไปหน้าผลงานของโรงเรียน)
   - แผ่น QR Code รายโรงเรียน (ตัดแจกได้)
   ต้องโหลด qrcode-generator ก่อน (cdn.jsdelivr.net/npm/qrcode-generator)
   ========================================================= */
var Report = (function () {
  'use strict';
  var esc = U.esc;

  /* ---------- ลิงก์และรหัส ---------- */
  function schoolCode(name) {
    var h = 2166136261, s = String(name || '').replace(/\s+/g, ''), i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h.toString(36);
  }
  function base(st) {
    var u = (st && st.publicUrl) ? String(st.publicUrl) : location.href.split('#')[0].split('?')[0].replace(/admin\.html$/, 'index.html');
    return u.split('#')[0];
  }
  function schoolLink(st, name) { return base(st) + '#s-' + schoolCode(name); }
  function workLink(st, id) { return base(st) + '#w-' + id; }
  function compLink(st, id) { return base(st) + '#c-' + id; }

  /* ---------- QR เป็น SVG (คมชัดเมื่อพิมพ์) ---------- */
  function qrSvg(text, cls) {
    if (typeof qrcode === 'undefined') {
      return '<div class="qr-missing ' + (cls || '') + '">QR</div>';
    }
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      var q = qrcode(0, 'M');
      q.addData(text);
      q.make();
      var n = q.getModuleCount(), m = 2, d = '', r, c;
      for (r = 0; r < n; r++) {
        for (c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
      }
      return '<svg class="qr ' + (cls || '') + '" viewBox="0 0 ' + (n + m * 2) + ' ' + (n + m * 2) + '" shape-rendering="crispEdges" role="img" aria-label="QR Code">' +
        '<rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#14213d"/></svg>';
    } catch (e) {
      return '<div class="qr-missing ' + (cls || '') + '">QR</div>';
    }
  }

  /* ---------- เตรียมข้อมูล ---------- */
  function ctx(settings, comps, results) {
    var cm = {};
    comps.forEach(function (c) { cm[c.id] = c; });
    var rs = results.filter(function (r) { return cm[r.competitionId]; }).map(function (r) {
      var o = U.clone(r); o._c = cm[r.competitionId]; o._m = U.medalOf(r, settings); return o;
    });
    rs.sort(function (a, b) { return U.sortResults(a, b, cm); });
    return { st: settings || {}, comps: comps, cm: cm, rs: rs };
  }
  function schools(cx, year) {
    var m = {}, list = [];
    cx.rs.forEach(function (r) {
      if (year && String(r._c.year) !== String(year)) return;
      if (!m[r.school]) { m[r.school] = { name: r.school, n: 0, w: 0, g: 0, s: 0, b: 0, years: {} }; list.push(m[r.school]); }
      var o = m[r.school];
      o.n++; o.years[r._c.year] = 1;
      if (Number(r.rank) === 1) o.w++;
      if (r._m === 'ทอง') o.g++; else if (r._m === 'เงิน') o.s++; else if (r._m === 'ทองแดง') o.b++;
    });
    list.sort(function (a, b) { return a.name.localeCompare(b.name, 'th'); });
    return list;
  }
  function signers(st) {
    var raw = st.signers || '';
    var lines = String(raw).split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l; });
    return lines.map(function (l) {
      var p = l.split('|');
      return { name: (p[0] || '').trim(), pos: (p[1] || '').trim() };
    });
  }
  function today() { return U.fmtDate(new Date().toISOString()); }

  /* ---------- ส่วนประกอบหน้า ---------- */
  function head(st, kicker, title, sub) {
    return '<header class="rp-head">' + BRAND_MARK + '<div class="rp-ht"><div class="rp-k">' + esc(kicker) + '</div><h1>' + esc(title) + '</h1>' +
      (sub ? '<div class="rp-sub">' + sub + '</div>' : '') + '</div></header>';
  }
  function foot(st, pageLabel) {
    return '<footer class="rp-foot"><span>' + esc(st.siteTitle || CONFIG.SYSTEM_NAME) + '</span><span>' + esc(st.footerText || '') + '</span><span>พิมพ์เมื่อ ' + today() + (pageLabel ? ' · ' + esc(pageLabel) : '') + '</span></footer>';
  }
  function signBlock(st) {
    var list = signers(st);
    if (!list.length) return '';
    return '<div class="rp-sign">' + list.map(function (s) {
      return '<div class="sg"><div class="ln">ลงชื่อ ......................................................</div><div>(' + (s.name ? esc(s.name) : '......................................................') + ')</div><div class="ps">' + esc(s.pos) + '</div></div>';
    }).join('') + '</div>';
  }
  function people(arr) { return (arr || []).map(esc).join('<br>'); }

  /* ---------- 1) ประกาศผลการแข่งขัน ---------- */
  function announce(cx, compIds) {
    return compIds.map(function (cid) {
      var c = cx.cm[cid];
      if (!c) return '';
      var rows = cx.rs.filter(function (r) { return r.competitionId === cid; }).sort(function (a, b) { return a.rank - b.rank; });
      var md = { 'ทอง': 0, 'เงิน': 0, 'ทองแดง': 0 }, adv = [];
      rows.forEach(function (r) { if (md[r._m] !== undefined) md[r._m]++; if (r.advance) adv.push(r); });
      return '<section class="sheet">' +
        head(cx.st, (cx.st.reportOrg || 'คณะกรรมการตัดสินการแข่งขัน'), 'ประกาศผลการแข่งขัน',
          esc(c.title) + '<br>' + esc(c.stage) + ' ปีการศึกษา ' + esc(c.year) + (c.date ? ' · แข่งขันวันที่ ' + U.fmtDate(c.date) : '') + (c.venue ? ' · ณ ' + esc(c.venue) : '')) +
        '<div class="rp-qr-corner">' + qrSvg(compLink(cx.st, cid)) + '<span>สแกนดูผลงาน<br>และรูปภาพ</span></div>' +
        (c.theme ? '<p class="rp-theme"><b>หัวข้อโจทย์:</b> ' + esc(c.theme) + '</p>' : '') +
        '<div class="rp-chips"><span>ทั้งหมด <b>' + rows.length + '</b> ทีม</span><span class="g">เหรียญทอง <b>' + md['ทอง'] + '</b></span><span class="s">เหรียญเงิน <b>' + md['เงิน'] + '</b></span><span class="b">เหรียญทองแดง <b>' + md['ทองแดง'] + '</b></span></div>' +
        '<table class="rp-tbl"><thead><tr><th style="width:54px">อันดับ</th><th>รางวัล</th><th>โรงเรียน</th><th>นักเรียน</th><th>ครูผู้ฝึกสอน</th><th style="width:60px">คะแนน</th><th style="width:92px">เหรียญ</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (r) {
          return '<tr><td class="c"><b>' + esc(r.rank) + '</b></td><td>' + esc(U.rankLabel(r.rank)) + (r.advance ? '<div class="adv">ตัวแทนระดับถัดไป</div>' : '') + '</td><td>' + esc(r.school) +
            '</td><td>' + people(r.students) + '</td><td>' + people(r.coaches) + '</td><td class="c">' + esc(r.score) + '</td><td class="c">' + U.medalTag(r._m) + '</td></tr>';
        }).join('') : '<tr><td colspan="7" class="c">ยังไม่มีผลการแข่งขัน</td></tr>') + '</tbody></table>' +
        (adv.length ? '<p class="rp-note"><b>ผู้ได้รับคัดเลือกเป็นตัวแทน:</b> ' + adv.map(function (r) { return esc(r.school) + ' (อันดับ ' + r.rank + ')'; }).join(', ') + '</p>' : '') +
        '<p class="rp-note">เกณฑ์เหรียญ: ทอง ≥ ' + esc(cx.st.goldMin || 80) + ' · เงิน ≥ ' + esc(cx.st.silverMin || 70) + ' · ทองแดง ≥ ' + esc(cx.st.bronzeMin || 60) + ' คะแนน · ประกาศ ณ วันที่ ' + today() + '</p>' +
        signBlock(cx.st) + foot(cx.st, c.level + ' / ' + c.year) + '</section>';
    }).join('');
  }

  /* ---------- 2) รายงานผลงานรายโรงเรียน ---------- */
  function school(cx, names) {
    return names.map(function (name) {
      var rows = cx.rs.filter(function (r) { return r.school === name; });
      var s = { w: 0, g: 0, si: 0, b: 0, y: {} };
      rows.forEach(function (r) {
        if (Number(r.rank) === 1) s.w++; s.y[r._c.year] = 1;
        if (r._m === 'ทอง') s.g++; else if (r._m === 'เงิน') s.si++; else if (r._m === 'ทองแดง') s.b++;
      });
      var link = schoolLink(cx.st, name);
      var chunks = [], per = 6, i;
      for (i = 0; i < Math.max(1, rows.length); i += per) chunks.push(rows.slice(i, i + per));
      return chunks.map(function (part, pi) {
        return '<section class="sheet">' +
          (pi === 0 ? head(cx.st, 'รายงานผลงานรายโรงเรียน', name, 'ผลงานการแข่งขันสร้างสรรค์ผลงานคณิตศาสตร์โดยใช้โปรแกรม GSP · ปีการศึกษา ' + Object.keys(s.y).sort().join(', ')) +
            '<div class="rp-school-top"><div class="rp-stats">' +
            '<div><b>' + rows.length + '</b><span>ผลงาน</span></div><div><b>' + s.w + '</b><span>ชนะเลิศ</span></div>' +
            '<div class="g"><b>' + s.g + '</b><span>เหรียญทอง</span></div><div class="s"><b>' + s.si + '</b><span>เหรียญเงิน</span></div><div class="b"><b>' + s.b + '</b><span>เหรียญทองแดง</span></div></div>' +
            '<div class="rp-qr-big">' + qrSvg(link) + '<div><b>สแกนเพื่อดูผลงานทั้งหมด</b><br>รูปภาพ ไฟล์ GSP และรายละเอียดผลงาน<div class="url">' + esc(link) + '</div></div></div></div>'
            : '<div class="rp-cont">' + esc(name) + ' (ต่อ)</div>') +
          '<div class="rp-works">' + part.map(function (r) {
            var img = (r.images || [])[0];
            return '<div class="rp-w">' + (img ? '<img alt="" src="' + esc(U.imgSrc(img, 500)) + '">' : '<div class="noimg"></div>') +
              '<div class="tx"><div class="mt">ปีการศึกษา ' + esc(r._c.year) + ' · ' + esc(r._c.level) + ' · ' + esc(r._c.stage) + '</div>' +
              '<h3>' + esc(U.rankLabel(r.rank)) + ' — ' + esc(r.title || '(ไม่ระบุชื่อผลงาน)') + '</h3>' +
              '<div class="tg">' + U.medalTag(r._m) + (r.score !== '' ? ' <span class="sc">' + esc(r.score) + ' คะแนน</span>' : '') + (r.advance ? ' <span class="adv">ตัวแทนระดับถัดไป</span>' : '') + '</div>' +
              '<div class="pp"><b>นักเรียน:</b> ' + (r.students || []).map(esc).join(', ') + '</div>' +
              ((r.coaches || []).length ? '<div class="pp"><b>ครูผู้ฝึกสอน:</b> ' + r.coaches.map(esc).join(', ') + '</div>' : '') + '</div>' +
              '<div class="wq">' + qrSvg(workLink(cx.st, r.id)) + '<span>ผลงานนี้</span></div></div>';
          }).join('') + (rows.length ? '' : '<p class="rp-note">ยังไม่มีผลงาน</p>') + '</div>' +
          foot(cx.st, name + (chunks.length > 1 ? ' · หน้า ' + (pi + 1) + '/' + chunks.length : '')) + '</section>';
      }).join('');
    }).join('');
  }

  /* ---------- 3) แผ่น QR Code รายโรงเรียน ---------- */
  function qrSheet(cx, list, year) {
    var per = 8, out = '', i;
    for (i = 0; i < list.length; i += per) {
      out += '<section class="sheet">' + (i === 0 ? head(cx.st, 'QR Code ผลงานรายโรงเรียน', 'สแกนเพื่อดูผลงานของโรงเรียน', year ? 'ปีการศึกษา ' + esc(year) : 'ทุกปีการศึกษา') : '') +
        '<div class="rp-qrgrid">' + list.slice(i, i + per).map(function (o) {
          return '<div class="qc">' + qrSvg(schoolLink(cx.st, o.name)) + '<div><b>' + esc(o.name) + '</b><span>' + o.n + ' ผลงาน' + (o.w ? ' · ชนะเลิศ ' + o.w : '') + '</span>' +
            '<span class="md"><i class="g">ทอง ' + o.g + '</i><i class="s">เงิน ' + o.s + '</i><i class="b">ทองแดง ' + o.b + '</i></span></div></div>';
        }).join('') + '</div>' + foot(cx.st, 'แผ่นที่ ' + (i / per + 1)) + '</section>';
    }
    return out || '<section class="sheet"><p class="rp-note">ยังไม่มีข้อมูล</p></section>';
  }

  /* ---------- 4) โปสเตอร์ QR หน้าเว็บ ---------- */
  function poster(cx) {
    var link = base(cx.st);
    return '<section class="sheet rp-poster">' + head(cx.st, 'ขอเชิญชมผลงาน', cx.st.siteTitle || CONFIG.SYSTEM_NAME, esc(cx.st.siteSubtitle || '')) +
      '<div class="pq">' + qrSvg(link) + '</div><p class="pl">สแกนเพื่อชมผลงานนักเรียนที่ได้รับรางวัล<br>ดาวน์โหลดโจทย์และไฟล์ GSP ไปฝึกทำ</p><div class="url c">' + esc(link) + '</div>' + foot(cx.st) + '</section>';
  }

  /* ---------- หน้าต่างตัวอย่างก่อนพิมพ์ ---------- */
  function open(title, sheets) {
    close();
    var d = document.createElement('div');
    d.id = 'reportRoot';
    d.innerHTML = '<div class="rp-bar"><b>' + esc(title) + '</b><span class="muted" style="font-size:13px">ขนาด A4 · เลือกปลายทาง "บันทึกเป็น PDF" ในหน้าต่างพิมพ์</span>' +
      '<span style="flex:1"></span><button class="btn btn-primary" id="rpPrint">' + ICON('dl') + 'พิมพ์ / บันทึกเป็น PDF</button><button class="btn" id="rpClose">' + ICON('x') + 'ปิด</button></div>' +
      '<div class="rp-pages">' + sheets + '</div>';
    document.body.appendChild(d);
    document.body.classList.add('rp-open');
    document.getElementById('rpClose').onclick = close;
    document.getElementById('rpPrint').onclick = function () {
      document.title = title;
      var t0 = Date.now();
      try { window.print(); } catch (e) {}
      if (Date.now() - t0 < 60) U.toast('ถ้าหน้าต่างพิมพ์ไม่ขึ้น ให้กด Ctrl+P (บางหน้าตัวอย่างบล็อกการพิมพ์ — ใช้งานได้ปกติเมื่อเปิดจากเว็บจริงบน Vercel)');
    };
    window.scrollTo(0, 0);
  }
  function close() {
    var d = document.getElementById('reportRoot');
    if (d && d.parentNode) d.parentNode.removeChild(d);
    document.body.classList.remove('rp-open');
  }

  return {
    ctx: ctx, schools: schools, schoolCode: schoolCode, schoolLink: schoolLink, workLink: workLink, compLink: compLink, base: base,
    qrSvg: qrSvg, announce: announce, school: school, qrSheet: qrSheet, poster: poster, open: open, close: close
  };
})();
