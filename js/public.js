/* =========================================================
   public.js — หน้าเผยแพร่ผลงาน (ES5)
   ========================================================= */
(function () {
  'use strict';
  var $ = U.$, $$ = U.$$, esc = U.esc;
  var S = {
    settings: {}, comps: [], compMap: {}, results: [],
    f: { q: '', year: '', level: '', stage: '', medal: '', gsp: false, school: '' },
    selYear: '',
    view: 'grid', limit: 12, champLevel: '', probYear: '', list: [], cur: null, imgIdx: 0, seen: {}
  };

  /* ---------- เริ่มต้น ---------- */
  function init() {
    $('#brand').innerHTML = BRAND_MARK + '<span class="brand-text">GSP Showcase<small>ผลงานสร้างสรรค์คณิตศาสตร์ ระดับประถมศึกษา</small></span>';
    $('#navToggle').innerHTML = ICON('menu');
    $('#searchIcon').outerHTML = ICON('search');
    U.bindGlow();
    $$('.gsp-help-btn').forEach(function (b) { b.onclick = U.gspHelp; });
    $('#fGsp').onchange = function () { S.f.gsp = this.checked; S.limit = 12; renderWorks(); };
    $('#navToggle').onclick = function () { $('#navlinks').classList.toggle('open'); };
    $$('#navlinks a').forEach(function (a) { a.addEventListener('click', function () { $('#navlinks').classList.remove('open'); }); });
    if (API.isDemo) {
      $('#demoBar').innerHTML = '<div class="demo-bar">โหมดสาธิต — ข้อมูลทั้งหมดเป็นตัวอย่าง ยังไม่ได้เชื่อมต่อ Google Sheets · ' +
        '<button id="resetDemo">รีเซ็ตข้อมูลตัวอย่าง</button></div>';
      $('#resetDemo').onclick = function () { API.resetDemo(); location.reload(); };
    }
    UI.loading('กำลังโหลดผลงาน…', 'กำลังสร้างวงกลมจากจุดศูนย์กลาง O');
    API.call('getPublic').then(function (d) {
      prepare(d);
      UI.setSettings(d.settings);
      renderAll();
      UI.close();
      route();
    }).catch(function (e) {
      UI.close();
      $('#worksOut').innerHTML = '<div class="empty">โหลดข้อมูลไม่สำเร็จ: ' + esc(e.message) + '</div>';
      UI.error(e.message, 'โหลดข้อมูลไม่สำเร็จ');
    });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', function (e) {
      if (!S.cur && !S.curSchool) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (!S.cur) return;
      if (e.key === 'ArrowRight') stepImg(1);
      if (e.key === 'ArrowLeft') stepImg(-1);
    });
  }

  function prepare(d) {
    S.settings = d.settings || {};
    S.comps = d.competitions || [];
    S.compMap = {};
    S.comps.forEach(function (c) { S.compMap[c.id] = c; });
    S.results = (d.results || []).filter(function (r) { return S.compMap[r.competitionId]; });
    S.results.forEach(function (r) { r._c = S.compMap[r.competitionId]; r._m = U.medalOf(r, S.settings); });
    S.results.sort(function (a, b) { return U.sortResults(a, b, S.compMap); });
  }

  function renderAll() {
    var st = S.settings;
    if (st.siteSubtitle) $('#heroSub').textContent = st.siteSubtitle;
    if (st.footerText) $('#footText').textContent = st.footerText;
    if (st.siteTitle) $('#footName').textContent = st.siteTitle;
    if (st.announcement) {
      $('#announceWrap').innerHTML = '<div class="announce"><span class="tag">ประกาศ</span><span>' + esc(st.announcement) + '</span></div>';
    }
    renderStats4();
    renderChampions();
    renderFilters();
    renderWorks();
    renderProblems();
    renderDashboard();
    renderYearly();
  }

  function years() {
    var y = {};
    S.comps.forEach(function (c) { y[c.year] = 1; });
    return Object.keys(y).map(Number).sort(function (a, b) { return b - a; });
  }
  function uniq(arr) { var o = {}, out = []; arr.forEach(function (x) { if (x && !o[x]) { o[x] = 1; out.push(x); } }); return out; }

  /* ---------- สถิติบนหัวเว็บ ---------- */
  function renderStats4() {
    var studs = 0, schools = uniq(S.results.map(function (r) { return r.school; }));
    S.results.forEach(function (r) { studs += (r.students || []).length; });
    var items = [[years().length, 'ปีการศึกษา'], [S.results.length, 'ผลงานที่ได้รับรางวัล'], [studs, 'นักเรียนที่เข้าแข่งขัน'], [schools.length, 'โรงเรียน']];
    $('#stats4').innerHTML = items.map(function (it) {
      return '<div class="stat"><b data-n="' + it[0] + '">0</b><span>' + it[1] + '</span></div>';
    }).join('');
    $$('#stats4 b').forEach(function (b) {
      var n = Number(b.getAttribute('data-n')), t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / 900);
        b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))).toLocaleString('th-TH');
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- โพเดียมผลงานชนะเลิศปีล่าสุด ---------- */
  function renderChampions() {
    var ys = years();
    if (!ys.length) { $('#podium').innerHTML = '<div class="empty" style="grid-column:1/-1">ยังไม่มีผลการแข่งขัน</div>'; return; }
    var y = ys[0];
    var comps = S.comps.filter(function (c) { return Number(c.year) === y; });
    var lvls = uniq(comps.map(function (c) { return c.level; })).sort();
    if (!S.champLevel || lvls.indexOf(S.champLevel) < 0) S.champLevel = lvls[lvls.length - 1];
    $('#champTitle').textContent = 'ผลงานชนะเลิศ ปีการศึกษา ' + y;
    $('#champTabs').innerHTML = lvls.map(function (l) {
      return '<button data-l="' + esc(l) + '"' + (l === S.champLevel ? ' class="on"' : '') + '>ระดับชั้น ' + esc(l) + '</button>';
    }).join('');
    $$('#champTabs button').forEach(function (b) { b.onclick = function () { S.champLevel = b.getAttribute('data-l'); renderChampions(); }; });
    var comp = comps.filter(function (c) { return c.level === S.champLevel; })[0];
    $('#champSub').textContent = comp ? (comp.stage + ' · ' + U.fmtDate(comp.date) + (comp.venue ? ' · ' + comp.venue : '')) : '';
    var top = S.results.filter(function (r) { return comp && r.competitionId === comp.id && Number(r.rank) <= 3; })
      .sort(function (a, b) { return a.rank - b.rank; });
    var order = [top[1], top[0], top[2]];
    $('#podium').innerHTML = order.map(function (r) {
      if (!r) return '<div></div>';
      var n = Number(r.rank), img = (r.images || [])[0];
      return '<article class="pod glow t' + n + ' p' + n + '" data-id="' + esc(r.id) + '"><span class="ring-b"></span>' + U.rankBadge(n) +
        '<div class="ph">' + (img ? '<img loading="lazy" alt="' + esc(r.title) + '" src="' + esc(U.imgSrc(img, 800)) + '">' : '') + '</div>' +
        '<div class="step"></div><div class="pb"><div class="pod-label">' + esc(U.rankLabel(n)) + '</div>' +
        '<h3>' + esc(r.title || '-') + '</h3><div class="sch">' + esc(r.school) + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + U.medalTag(r._m) +
        (r.score !== '' && r.score !== undefined ? '<span class="tag gray">' + esc(r.score) + ' คะแนน</span>' : '') +
        (r.advance ? '<span class="tag green">' + ICON('flag') + ' ตัวแทน</span>' : '') + '</div></div></article>';
    }).join('');
    $$('#podium .pod').forEach(function (el) { el.onclick = function () { openWork(el.getAttribute('data-id')); }; });
  }

  /* ---------- ตัวกรอง ---------- */
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function renderFilters() {
    var f = S.f;
    $('#fYear').innerHTML = opt('', 'ทุกปีการศึกษา', f.year) + years().map(function (y) { return opt(y, 'ปีการศึกษา ' + y, f.year); }).join('');
    $('#fLevel').innerHTML = opt('', 'ทุกระดับชั้น', f.level) + uniq(S.comps.map(function (c) { return c.level; })).sort().map(function (l) { return opt(l, 'ระดับชั้น ' + l, f.level); }).join('');
    $('#fStage').innerHTML = opt('', 'ทุกระดับการแข่งขัน', f.stage) + uniq(S.comps.map(function (c) { return c.stage; })).map(function (s) { return opt(s, s, f.stage); }).join('');
    $('#fSchool').innerHTML = opt('', 'ทุกโรงเรียน', f.school) + uniq(S.results.map(function (r) { return r.school; })).sort(function (a, b) { return a.localeCompare(b, 'th'); }).map(function (x) { return opt(x, x, f.school); }).join('');
    $('#fMedal').innerHTML = opt('', 'ทุกเหรียญ', f.medal) + ['ทอง', 'เงิน', 'ทองแดง', 'เข้าร่วม'].map(function (m) { return opt(m, m === 'เข้าร่วม' ? 'เข้าร่วม' : 'เหรียญ' + m, f.medal); }).join('') + opt('top3', 'เฉพาะอันดับ 1–3', f.medal);
    $('#fQ').value = f.q;
    var t = null;
    $('#fQ').oninput = function () { clearTimeout(t); t = setTimeout(function () { S.f.q = $('#fQ').value.trim(); S.limit = 12; renderWorks(); }, 200); };
    ['Year', 'Level', 'Stage', 'Medal', 'School'].forEach(function (k) {
      $('#f' + k).onchange = function () { S.f[k.toLowerCase()] = this.value; S.limit = 12; renderWorks(); };
    });
    $('#fClear').onclick = function () { S.f = { q: '', year: '', level: '', stage: '', medal: '', gsp: false, school: '' }; $('#fGsp').checked = false; renderFilters(); renderWorks(); };
    $$('#viewSeg button').forEach(function (b) {
      b.onclick = function () {
        S.view = b.getAttribute('data-v');
        $$('#viewSeg button').forEach(function (x) { x.classList.toggle('on', x === b); });
        renderWorks();
      };
    });
  }

  function filtered() {
    var f = S.f, q = f.q.toLowerCase();
    return S.results.filter(function (r) {
      var c = r._c;
      if (f.year && String(c.year) !== String(f.year)) return false;
      if (f.level && c.level !== f.level) return false;
      if (f.stage && c.stage !== f.stage) return false;
      if (f.medal === 'top3' && Number(r.rank) > 3) return false;
      if (f.medal && f.medal !== 'top3' && r._m !== f.medal) return false;
      if (f.gsp && !hasGsp(r)) return false;
      if (f.school && r.school !== f.school) return false;
      if (q) {
        var hay = [r.title, r.school, (r.students || []).join(' '), (r.coaches || []).join(' '), c.title].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function hasGsp(r) { return (r.files || []).some(function (f) { return U.isGsp(f.name); }); }
  /* ---------- ทำเนียบผลงาน ---------- */
  function cardHtml(r) {
    var img = (r.images || [])[0], c = r._c, n = Number(r.rank), top = n <= 3;
    return '<article class="card glow' + (top ? ' t' + n : '') + '" data-id="' + esc(r.id) + '">' + (top ? '<span class="ring-b"></span>' : '') +
      '<div class="thumb">' + (img ? '<img loading="lazy" alt="' + esc(r.title) + '" src="' + esc(U.imgSrc(img, 600)) + '">' : '') +
      (hasGsp(r) ? '<span class="gsp-chip">' + ICON('file') + 'GSP</span>' : '') +
      U.rankBadge(r.rank) + '<div class="badges">' + U.medalTag(r._m) + '</div></div>' +
      '<div class="body"><div class="meta"><span class="mono">' + esc(c.year) + '</span>·<span>' + esc(c.level) + '</span>·<span>' + esc(U.rankLabel(r.rank)) + '</span></div>' +
      '<h3>' + esc(r.title || '(ไม่ระบุชื่อผลงาน)') + '</h3><div class="sch">' + esc(r.school) + '</div>' +
      '<div class="foot"><span>' + ICON('users') + (r.students || []).length + ' คน</span><span>' + ICON('eye') + (r.views || 0) + '</span><span>' + ICON('dl') + (r.downloads || 0) + '</span></div>' +
      '</div></article>';
  }
  function renderWorks(keep) {
    var list = filtered();
    S.list = list;
    $('#count').textContent = 'พบ ' + list.length + ' ผลงาน';
    if (!list.length) { $('#worksOut').innerHTML = '<div class="empty">ไม่พบผลงานตามเงื่อนไขที่เลือก</div>'; return; }
    if (S.view === 'grid') {
      $('#worksOut').innerHTML = '<div class="cards">' + list.slice(0, S.limit).map(cardHtml).join('') + '</div>' +
        (list.length > S.limit ? '<div style="text-align:center;margin-top:22px"><button class="btn" id="more">แสดงเพิ่มอีก ' + Math.min(12, list.length - S.limit) + ' ผลงาน (เหลือ ' + (list.length - S.limit) + ')</button></div>' : '');
      if ($('#more')) $('#more').onclick = function () { S.limit += 12; renderWorks(); };
    } else {
      var groups = [], gm = {};
      list.forEach(function (r) {
        if (!gm[r.competitionId]) { gm[r.competitionId] = { c: r._c, rows: [] }; groups.push(gm[r.competitionId]); }
        gm[r.competitionId].rows.push(r);
      });
      $('#worksOut').innerHTML = groups.map(function (g) {
        return '<div class="ann-group"><h3><span class="tag">ปีการศึกษา ' + esc(g.c.year) + '</span>' + esc(g.c.title) +
          '<span class="muted" style="font-weight:400;font-size:13px">' + esc(g.c.stage) + ' · ' + U.fmtDate(g.c.date) + '</span></h3>' +
          '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>อันดับ</th><th>รางวัล</th><th>โรงเรียน</th><th>นักเรียน</th><th>ครูผู้ฝึกสอน</th><th>คะแนน</th><th>เหรียญ</th></tr></thead><tbody>' +
          g.rows.map(function (r) {
            return '<tr class="click" data-id="' + esc(r.id) + '"><td>' + U.rankBadge(r.rank) + '</td><td>' + esc(U.rankLabel(r.rank)) + (r.advance ? ' <span class="tag green">ตัวแทน</span>' : '') +
              '</td><td>' + esc(r.school) + '</td><td>' + (r.students || []).map(esc).join('<br>') + '</td><td>' + (r.coaches || []).map(esc).join('<br>') +
              '</td><td class="mono">' + esc(r.score) + '</td><td>' + U.medalTag(r._m) + '</td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }).join('');
    }
    $$('#worksOut [data-id]').forEach(function (el) { el.onclick = function () { openWork(el.getAttribute('data-id')); }; });
  }

  /* ---------- คลังโจทย์ ---------- */
  function fileRow(f, rid) {
    var g = U.isGsp(f.name), pdf = U.ext(f.name) === 'pdf';
    return '<a class="file' + (g ? ' gspf' : '') + '" href="' + esc(pdf ? U.viewUrl(f) : U.dlUrl(f)) + '" target="_blank" rel="noopener" data-dl="' + esc(rid || '') + '"' + (g ? ' title="ไฟล์โปรแกรม The Geometer\'s Sketchpad"' : '') + '>' +
      '<span class="ext ' + U.extCls(f.name) + '">' + esc(U.ext(f.name).slice(0, 4)) + '</span>' +
      '<span class="fn"><b>' + esc(f.name) + '</b><small>' + esc(f.kind || 'ไฟล์') + (f.size ? ' · ' + U.fmtSize(f.size) : '') +
      (g ? ' · เปิดด้วยโปรแกรม GSP' : '') + (pdf ? ' · คลิกเพื่อเปิดดู' : '') + '</small></span>' + ICON(pdf ? 'eye' : 'dl') + '</a>';
  }
  function bindDownloads(root) {
    $$('a.file', root).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var rid = a.getAttribute('data-dl');
        if (rid) API.call('hit', { id: rid, type: 'download' }).catch(function () {});
        if (API.isDemo) { e.preventDefault(); U.toast('โหมดสาธิต: ไฟล์ตัวอย่างยังไม่มีอยู่จริง (นับยอดดาวน์โหลดแล้ว)'); }
      });
    });
  }
  function renderProblems() {
    var ys = years();
    if (!S.probYear && ys.length) S.probYear = String(ys[0]);
    $('#probSeg').innerHTML = '<button data-y="all"' + (S.probYear === 'all' ? ' class="on"' : '') + '>ทุกปี</button>' + ys.map(function (y) {
      return '<button data-y="' + y + '"' + (String(y) === S.probYear ? ' class="on"' : '') + '>' + y + '</button>';
    }).join('');
    $$('#probSeg button').forEach(function (b) { b.onclick = function () { S.probYear = b.getAttribute('data-y'); renderProblems(); }; });
    var comps = S.comps.filter(function (c) { return S.probYear === 'all' || String(c.year) === S.probYear; })
      .sort(function (a, b) { return b.year - a.year || String(a.level).localeCompare(String(b.level)); });
    if (!comps.length) { $('#probOut').innerHTML = '<div class="empty">ยังไม่มีโจทย์</div>'; return; }
    $('#probOut').innerHTML = comps.map(function (c) {
      var n = S.results.filter(function (r) { return r.competitionId === c.id; }).length;
      return '<div class="prob glow"><div class="yr">ปีการศึกษา ' + esc(c.year) + ' · ' + esc(c.stage) + '</div>' +
        '<h3>ระดับชั้น ' + esc(c.level) + '</h3>' +
        (c.theme ? '<div class="theme"><b>หัวข้อ:</b> ' + esc(c.theme) + '</div>' : '') +
        (c.description ? '<div class="muted" style="font-size:13.5px">' + esc(c.description) + '</div>' : '') +
        '<div class="filelist">' + ((c.files || []).length ? c.files.map(function (f) { return fileRow(f); }).join('') : '<div class="muted">ยังไม่มีไฟล์โจทย์</div>') + '</div>' +
        '<button class="btn btn-sm" data-c="' + esc(c.id) + '" style="align-self:flex-start">ดูผลงานที่ได้รับรางวัล (' + n + ')</button></div>';
    }).join('');
    bindDownloads($('#probOut'));
    $$('#probOut [data-c]').forEach(function (b) {
      b.onclick = function () {
        var c = S.compMap[b.getAttribute('data-c')];
        S.f = { q: '', year: String(c.year), level: c.level, stage: c.stage, medal: '', gsp: false, school: '' };
        renderFilters(); renderWorks();
        document.getElementById('works').scrollIntoView();
      };
    });
  }

  /* ---------- แดชบอร์ดสถิติ (Blueprint) ---------- */
  var CC = Charts.C;
  function renderDashboard() {
    var A = Stats.compute(S.comps, S.results, S.settings);
    S.stats = A;
    var k = [
      ['trophy', A.teams, 'ผลงานที่ได้รับรางวัล', CC.gold],
      ['flag', A.schoolCount, 'โรงเรียนที่เข้าร่วม', CC.blue],
      ['users', A.students, 'นักเรียนที่แข่งขัน', CC.cyan],
      ['star', A.coachCount, 'ครูผู้ฝึกสอน', CC.violet],
      ['eye', A.avg === null ? '-' : A.avg.toFixed(2), 'คะแนนเฉลี่ยรวม', CC.green],
      ['file', A.gsp, 'ไฟล์ GSP ให้ดาวน์โหลด', '#7fa8ff']
    ];
    $('#kpiDark').innerHTML = k.map(function (x) {
      return '<div class="bp-card glow nk" style="--c:' + x[3] + '"><span class="ic">' + ICON(x[0]) + '</span><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></div>';
    }).join('');
    var M = A.medals;
    var segs = [
      { label: 'เหรียญทอง', value: M['ทอง'], color: CC.gold },
      { label: 'เหรียญเงิน', value: M['เงิน'], color: CC.silver },
      { label: 'เหรียญทองแดง', value: M['ทองแดง'], color: CC.bronze },
      { label: 'เข้าร่วม', value: M['เข้าร่วม'], color: CC.none }
    ];
    $('#chDonut').innerHTML = Charts.donut(segs, { unit: 'ผลงาน', aria: 'สัดส่วนเหรียญรางวัล' });
    $('#lgDonut').innerHTML = segs.map(function (s) {
      return '<span><i style="background:' + s.color + ';color:' + s.color + '"></i>' + s.label + ' ' + s.value + ' (' + (A.teams ? Math.round(s.value / A.teams * 100) : 0) + '%)</span>';
    }).join('');
    var Y = A.years, labels = Y.map(function (y) { return String(y.year); });
    var lo = 100;
    Y.forEach(function (y) { if (y.min !== null && y.min < lo) lo = y.min; });
    lo = Math.max(0, Math.floor((lo - 5) / 10) * 10);
    $('#chLine').innerHTML = Y.length ? Charts.line({
      labels: labels, yMin: lo, yMax: 100, yStep: 10, aria: 'แนวโน้มคะแนนรายปี',
      series: [
        { name: 'สูงสุด', color: CC.gold, values: Y.map(function (y) { return y.max; }), points: true, showValue: true },
        { name: 'เฉลี่ย', color: CC.cyan, values: Y.map(function (y) { return y.avg; }), fill: true, showValue: true },
        { name: 'ต่ำสุด', color: CC.violet, values: Y.map(function (y) { return y.min; }), dash: true }
      ]
    }) : '<div class="muted">ยังไม่มีข้อมูล</div>';
    $('#lgLine').innerHTML = '<span><i style="background:' + CC.gold + ';color:' + CC.gold + '"></i>คะแนนสูงสุด</span><span><i style="background:' + CC.cyan + ';color:' + CC.cyan + '"></i>คะแนนเฉลี่ย</span><span><i style="background:' + CC.violet + ';color:' + CC.violet + '"></i>คะแนนต่ำสุด</span>';
    $('#chStack').innerHTML = Y.length ? Charts.stack({
      labels: labels, aria: 'จำนวนผลงานต่อปี',
      stacks: [
        { name: 'ทอง', color: CC.gold, values: Y.map(function (y) { return y.medals['ทอง']; }) },
        { name: 'เงิน', color: CC.silver, values: Y.map(function (y) { return y.medals['เงิน']; }) },
        { name: 'ทองแดง', color: CC.bronze, values: Y.map(function (y) { return y.medals['ทองแดง']; }) },
        { name: 'เข้าร่วม', color: CC.none, values: Y.map(function (y) { return y.medals['เข้าร่วม']; }) }
      ]
    }) : '';
    var m = {}, list = [];
    S.results.forEach(function (r) {
      if (!m[r.school]) { m[r.school] = { s: r.school, g: 0, si: 0, b: 0, w: 0, t: 0 }; list.push(m[r.school]); }
      var o = m[r.school];
      if (r._m === 'ทอง') o.g++; else if (r._m === 'เงิน') o.si++; else if (r._m === 'ทองแดง') o.b++;
      if (Number(r.rank) === 1) o.w++;
      o.t++;
    });
    list.sort(function (a, b) { return b.w - a.w || b.g - a.g || b.si - a.si || b.b - a.b || b.t - a.t; });
    var mx = 1; list.forEach(function (o) { if (o.t > mx) mx = o.t; });
    $('#leader').innerHTML = list.length ? list.slice(0, 8).map(function (o, i) {
      return '<div class="lb-row" data-school="' + esc(o.s) + '" style="cursor:pointer" title="ดูผลงานของโรงเรียน"><span class="n">' + (i + 1) + '</span><div><div style="color:#fff">' + esc(o.s) + (o.w ? ' <span style="color:' + CC.gold + ';font-size:12px">★ ชนะเลิศ ' + o.w + '</span>' : '') +
        '</div><div class="bar"><span style="width:' + (o.t / mx * 100) + '%"></span></div></div>' +
        '<div class="md"><em style="color:' + CC.gold + '">' + o.g + '</em><em style="color:' + CC.silver + '">' + o.si + '</em><em style="color:' + CC.bronze + '">' + o.b + '</em><em style="color:#8d99b8">/' + o.t + '</em></div></div>';
    }).join('') : '<div class="muted">ยังไม่มีข้อมูล</div>';
    $$('#leader [data-school]').forEach(function (el) { el.onclick = function () { openSchool(el.getAttribute('data-school')); }; });
  }

  /* ---------- สรุปการแข่งขันรายปี ---------- */
  function renderYearly() {
    var Y = S.stats.years;
    if (!Y.length) { $('#yearOut').innerHTML = '<div class="muted">ยังไม่มีข้อมูล</div>'; return; }
    if (!S.selYear) S.selYear = String(Y[Y.length - 1].year);
    $('#yearTabs').innerHTML = Y.slice().reverse().map(function (y) {
      return '<button data-y="' + y.year + '"' + (String(y.year) === S.selYear ? ' class="on"' : '') + '>' + y.year + '</button>';
    }).join('');
    $$('#yearTabs button').forEach(function (b) { b.onclick = function () { S.selYear = b.getAttribute('data-y'); renderYearly(); }; });
    var idx = -1;
    Y.forEach(function (y, i) { if (String(y.year) === S.selYear) idx = i; });
    var y = Y[idx], p = idx > 0 ? Y[idx - 1] : null, D = Stats.delta;
    function mini(v, l, d) { return '<div class="mini glow"><b>' + esc(v) + d + '</b><span>' + l + '</span></div>'; }
    var themes = uniq(S.comps.filter(function (c) { return String(c.year) === S.selYear; }).map(function (c) { return c.theme; }));
    var html = '<div class="yr-head"><div class="yr-big"><small>ปีการศึกษา</small>' + y.year + '</div>' +
      mini(y.teams, 'ทีมที่ได้รับรางวัล', p ? D(y.teams, p.teams) : '') +
      mini(y.schoolCount, 'โรงเรียน', p ? D(y.schoolCount, p.schoolCount) : '') +
      mini(y.students, 'นักเรียน', p ? D(y.students, p.students) : '') +
      mini(y.coachCount, 'ครูผู้ฝึกสอน', p ? D(y.coachCount, p.coachCount) : '') +
      mini(y.avg === null ? '-' : y.avg.toFixed(2), 'คะแนนเฉลี่ย', p ? D(y.avg, p.avg, 2) : '') +
      mini(y.max === null ? '-' : y.max, 'คะแนนสูงสุด', p ? D(y.max, p.max, 2) : '') + '</div>' +
      (p ? '' : '<p class="muted" style="margin:-6px 0 14px;font-size:12.5px">ปีแรกในระบบ — ยังไม่มีปีก่อนหน้าให้เปรียบเทียบ</p>') +
      themes.map(function (t) { return '<p class="theme-line"><b style="color:#fff">หัวข้อโจทย์:</b> ' + esc(t) + '</p>'; }).join('') +
      '<div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-2 tw-gap-4">' + y.levelList.map(levelCard).join('') + '</div>';
    $('#yearOut').innerHTML = html;
    $$('#yearOut [data-id]').forEach(function (el) { el.onclick = function () { openWork(el.getAttribute('data-id')); }; });
  }
  function levelCard(l) {
    var c = l.comp, ch = l.champion, M = l.medals, tot = l.teams || 1, img = ch && (ch.images || [])[0];
    function seg(v, col) { return v ? '<span style="width:' + (v / tot * 100) + '%;background:' + col + ';box-shadow:0 0 8px ' + col + '"></span>' : ''; }
    var lo = l.min === null ? 50 : Math.max(0, Math.floor(l.min / 10) * 10 - (l.min % 10 < 3 ? 10 : 0));
    var st = S.settings;
    return '<div class="bp-card glow"><h3>ระดับชั้น ' + esc(c.level) + ' <span class="m">' + esc(c.stage) + '</span></h3>' +
      '<div class="sub">' + U.fmtDate(c.date) + (c.venue ? ' · ' + esc(c.venue) : '') + ' · ' + l.teams + ' ทีม · ' + l.schoolCount + ' โรงเรียน · ' + l.students + ' คน</div>' +
      (ch ? '<div class="champ glow t1" data-id="' + esc(ch.id) + '"><span class="ring-b"></span>' + (img ? '<img alt="" src="' + esc(U.imgSrc(img, 400)) + '">' : '<div></div>') +
        '<div><div class="lbl">🏆 ' + esc(U.rankLabel(ch.rank)) + (ch.score !== '' ? ' · ' + esc(ch.score) + ' คะแนน' : '') + '</div><h4>' + esc(ch.title || '-') + '</h4><p>' + esc(ch.school) + '</p>' +
        '<p style="color:#8d99b8;font-size:12px">' + (ch.students || []).map(esc).join(', ') + '</p></div></div>' : '') +
      '<div class="medal-strip">' + seg(M['ทอง'], CC.gold) + seg(M['เงิน'], CC.silver) + seg(M['ทองแดง'], CC.bronze) + seg(M['เข้าร่วม'], CC.none) + '</div>' +
      '<div class="legend-d" style="font-size:12px"><span><i style="background:' + CC.gold + ';color:' + CC.gold + '"></i>ทอง ' + M['ทอง'] + '</span><span><i style="background:' + CC.silver + ';color:' + CC.silver + '"></i>เงิน ' + M['เงิน'] + '</span><span><i style="background:' + CC.bronze + ';color:' + CC.bronze + '"></i>ทองแดง ' + M['ทองแดง'] + '</span>' +
      '<span style="margin-left:auto;font-family:var(--mono)">x̄ = ' + (l.avg === null ? '-' : l.avg.toFixed(2)) + ' · max ' + (l.max === null ? '-' : l.max) + ' · min ' + (l.min === null ? '-' : l.min) + '</span></div>' +
      (l.nScore ? '<div style="margin-top:6px">' + Charts.numberLine(l.rows.filter(function (r) { return r.score !== '' && r.score !== undefined; }).map(function (r) {
        return { v: Number(r.score), label: r.rank, color: Charts.medalColor(r._m), title: 'อันดับ ' + r.rank + ' ' + r.school + ' — ' + r.score + ' คะแนน' };
      }), { min: lo, max: 100, aria: 'การกระจายคะแนน', bands: [
        { from: Number(st.bronzeMin || 60), to: Number(st.silverMin || 70), color: CC.bronze },
        { from: Number(st.silverMin || 70), to: Number(st.goldMin || 80), color: CC.silver },
        { from: Number(st.goldMin || 80), to: 100, color: CC.gold }] }) + '</div>' : '') +
      '<div class="top-list">' + l.rows.slice(1, 5).map(function (r) {
        return '<div class="it" data-id="' + esc(r.id) + '">' + U.rankBadge(r.rank) + '<span>' + esc(r.school) + ' <span class="muted">· ' + esc(r.title || '') + '</span></span><span class="sc">' + esc(r.score) + '</span></div>';
      }).join('') + (l.rows.length > 5 ? '<div class="muted" style="font-size:12.5px;padding-left:6px">และอีก ' + (l.rows.length - 5) + ' ทีม</div>' : '') + '</div>' +
      (l.advance.length ? '<div class="adv"><span class="muted" style="font-size:12.5px">ตัวแทนระดับถัดไป:</span>' + l.advance.map(function (r) { return '<span class="tag">' + ICON('flag') + esc(r.school) + '</span>'; }).join('') + '</div>' : '') +
      '</div>';
  }

  /* ---------- รายละเอียดผลงาน (Modal) ---------- */
  function route() {
    var h = location.hash.replace('#', '');
    if (h.indexOf('w-') === 0) { var id = h.slice(2); if (!S.cur || S.cur.id !== id) openWork(id, true); }
    else if (h.indexOf('s-') === 0) { var nm = schoolByCode(h.slice(2)); if (nm && S.curSchool !== nm) openSchool(nm, true); }
    else if (h.indexOf('c-') === 0) {
      var c = S.compMap[h.slice(2)];
      if (S.cur || S.curSchool) closeModal(true);
      if (c) {
        S.f = { q: '', year: String(c.year), level: c.level, stage: c.stage, medal: '', gsp: false, school: '' };
        S.view = 'table';
        $$('#viewSeg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-v') === 'table'); });
        renderFilters(); renderWorks();
        setTimeout(function () { document.getElementById('works').scrollIntoView(); }, 50);
      }
    }
    else if (S.cur || S.curSchool) closeModal(true);
  }
  function schoolByCode(code) {
    var found = '';
    S.results.forEach(function (r) { if (!found && Report.schoolCode(r.school) === code) found = r.school; });
    return found;
  }

  /* ---------- หน้าผลงานรายโรงเรียน ---------- */
  function openSchool(name, fromHash) {
    var rows = S.results.filter(function (r) { return r.school === name; });
    if (!rows.length) return;
    S.cur = null; S.curSchool = name;
    if (!fromHash) location.hash = 's-' + Report.schoolCode(name);
    var st = { w: 0, g: 0, s: 0, b: 0, y: {}, stu: 0 };
    rows.forEach(function (r) {
      if (Number(r.rank) === 1) st.w++; st.y[r._c.year] = 1; st.stu += (r.students || []).length;
      if (r._m === 'ทอง') st.g++; else if (r._m === 'เงิน') st.s++; else if (r._m === 'ทองแดง') st.b++;
    });
    var link = Report.schoolLink(S.settings, name);
    $('#modalRoot').innerHTML = '<div class="modal-bg" id="mbg"><div class="modal"><div class="modal-head">' + ICON('flag') + '<h3>ผลงานของ' + esc(name) + '</h3>' +
      '<button class="icon-btn" id="mClose" title="ปิด">' + ICON('x') + '</button></div><div class="modal-body">' +
      '<div class="school-top"><div class="school-stats">' +
      '<div class="stat"><b>' + rows.length + '</b><span>ผลงาน</span></div><div class="stat"><b>' + st.w + '</b><span>ชนะเลิศ</span></div>' +
      '<div class="stat"><b style="color:#9a7408">' + st.g + '</b><span>เหรียญทอง</span></div><div class="stat"><b style="color:#5d6a80">' + st.s + '</b><span>เหรียญเงิน</span></div>' +
      '<div class="stat"><b style="color:var(--bronze)">' + st.b + '</b><span>เหรียญทองแดง</span></div><div class="stat"><b>' + st.stu + '</b><span>นักเรียน</span></div></div>' +
      '<div class="school-qr"><div class="qr-inline">' + Report.qrSvg(link) + '</div><div><b>QR Code ของโรงเรียน</b><div class="muted" style="font-size:12.5px">ปีการศึกษา ' + Object.keys(st.y).sort().join(', ') + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-sm" id="sCopy">' + ICON('link') + 'คัดลอกลิงก์</button>' +
      '<button class="btn btn-sm btn-primary" id="sPrint">' + ICON('dl') + 'รายงาน PDF</button></div></div></div></div>' +
      '<div class="cards" style="margin-top:18px">' + rows.map(cardHtml).join('') + '</div></div></div></div>';
    document.body.style.overflow = 'hidden';
    $('#mClose').onclick = function () { closeModal(); };
    $('#mbg').onclick = function (e) { if (e.target.id === 'mbg') closeModal(); };
    $$('#modalRoot .card').forEach(function (el) { el.onclick = function () { S.back = name; openWork(el.getAttribute('data-id')); }; });
    $('#sCopy').onclick = function () { U.copy(link).then(function () { U.toast('คัดลอกลิงก์แล้ว', 'ok'); }).catch(function () { U.toast(link); }); };
    $('#sPrint').onclick = function () { Report.open('รายงานผลงาน ' + name, Report.school(Report.ctx(S.settings, S.comps, S.results), [name])); };
  }
  function openWork(id, fromHash) {
    var r = null;
    S.results.forEach(function (x) { if (x.id === id) r = x; });
    if (!r) return;
    S.cur = r; S.imgIdx = 0; S.curSchool = null;
    if (!fromHash) location.hash = 'w-' + id;
    if (!S.seen[id]) { S.seen[id] = 1; r.views = (r.views || 0) + 1; API.call('hit', { id: id, type: 'view' }).catch(function () {}); }
    renderModal();
    document.body.style.overflow = 'hidden';
  }
  function closeModal(fromHash) {
    S.cur = null; S.curSchool = null;
    $('#modalRoot').innerHTML = '';
    document.body.style.overflow = '';
    if (!fromHash && S.back) { var b = S.back; S.back = null; openSchool(b); return; }
    S.back = null;
    if (!fromHash && location.hash) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    }
  }
  function stepImg(d) {
    var n = (S.cur.images || []).length;
    if (n < 2) return;
    S.imgIdx = (S.imgIdx + d + n) % n;
    paintGallery();
  }
  function paintGallery() {
    var imgs = S.cur.images || [], m = $('#gMain');
    if (!m) return;
    m.innerHTML = imgs.length ? '<img alt="" src="' + esc(U.imgSrc(imgs[S.imgIdx], 1600)) + '">' : '<span class="muted">ไม่มีรูปภาพ</span>';
    $$('#gThumbs img').forEach(function (t, i) { t.classList.toggle('on', i === S.imgIdx); });
  }
  function renderModal() {
    var r = S.cur, c = r._c, imgs = r.images || [];
    var idx = S.list.indexOf(r);
    var link = location.href.split('#')[0] + '#w-' + r.id;
    var html = '<div class="modal-bg" id="mbg"><div class="modal">' +
      '<div class="modal-head">' + U.rankBadge(r.rank) + '<h3>' + esc(U.rankLabel(r.rank)) + ' · ระดับชั้น ' + esc(c.level) + ' · ปีการศึกษา ' + esc(c.year) + '</h3>' +
      (idx > -1 ? '<button class="icon-btn" id="mPrev" title="ผลงานก่อนหน้า">' + ICON('left') + '</button><button class="icon-btn" id="mNext" title="ผลงานถัดไป">' + ICON('right') + '</button>' : '') +
      '<button class="icon-btn" id="mClose" title="ปิด">' + ICON('x') + '</button></div>' +
      '<div class="work"><div class="gallery"><div class="main" id="gMain"></div>' +
      (imgs.length > 1 ? '<button class="nav prev" id="gPrev">' + ICON('left') + '</button><button class="nav next" id="gNext">' + ICON('right') + '</button>' +
        '<div class="thumbs" id="gThumbs">' + imgs.map(function (im, i) { return '<img data-i="' + i + '" alt="" src="' + esc(U.imgSrc(im, 200)) + '">'; }).join('') + '</div>' : '') +
      '</div><div class="work-info">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' + U.medalTag(r._m) + (r.score !== '' && r.score !== undefined ? '<span class="tag gray">' + esc(r.score) + ' คะแนน</span>' : '') +
      (r.advance ? '<span class="tag green">' + ICON('flag') + ' ได้เป็นตัวแทนแข่งขันระดับถัดไป</span>' : '') + '</div>' +
      '<h2>' + esc(r.title || '(ไม่ระบุชื่อผลงาน)') + '</h2>' +
      '<dl class="kv"><dt>โรงเรียน</dt><dd><a href="#" id="schLink">' + esc(r.school) + '</a> <span class="muted" style="font-size:12px">(ดูผลงานทั้งหมดของโรงเรียน)</span></dd>' +
      '<dt>นักเรียน</dt><dd><ul>' + (r.students || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></dd>' +
      '<dt>ครูผู้ฝึกสอน</dt><dd><ul>' + (r.coaches || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></dd>' +
      '<dt>การแข่งขัน</dt><dd>' + esc(c.stage) + '<br><span class="muted">' + U.fmtDate(c.date) + (c.venue ? ' · ' + esc(c.venue) : '') + '</span></dd>' +
      (c.theme ? '<dt>หัวข้อโจทย์</dt><dd>' + esc(c.theme) + '</dd>' : '') + '</dl>' +
      (r.description ? '<div class="desc">' + esc(r.description) + '</div>' : '') +
      '<div><div style="font-weight:600;font-size:14px;margin-bottom:8px">ไฟล์ผลงานให้ดาวน์โหลด</div><div class="filelist">' +
      ((r.files || []).length ? r.files.map(function (f) { return fileRow(f, r.id); }).join('') : '<div class="muted">ไม่มีไฟล์แนบ</div>') + '</div>' +
      (hasGsp(r) ? '<div class="gsp-help" style="margin-top:10px">' + ICON('file') + '<div>ไฟล์ <b>.gsp</b> เปิดด้วยโปรแกรม The Geometer\'s Sketchpad · <a href="#" class="gsp-help-link">ดูวิธีเปิดไฟล์</a></div></div>' : '') + '</div>' +
      ((c.files || []).length ? '<div><div style="font-weight:600;font-size:14px;margin-bottom:8px">โจทย์ของปีนี้</div><div class="filelist">' + c.files.map(function (f) { return fileRow(f); }).join('') + '</div></div>' : '') +
      '<div><div style="font-weight:600;font-size:14px;margin-bottom:8px">แชร์ผลงานนี้</div><div style="display:flex;gap:12px;align-items:center"><div class="qr-inline">' + Report.qrSvg(link) + '</div><div style="flex:1;min-width:0"><div class="share-row"><input class="input" readonly id="shareLink" value="' + esc(link) + '"><button class="btn" id="copyLink">' + ICON('link') + 'คัดลอก</button></div><div class="muted" style="font-size:12px;margin-top:6px">สแกน QR เพื่อเปิดผลงานนี้บนมือถือ</div></div></div></div>' +
      '<div class="muted" style="font-size:12.5px">' + ICON('eye') + ' เข้าชม ' + (r.views || 0) + ' ครั้ง · ' + ICON('dl') + ' ดาวน์โหลด ' + (r.downloads || 0) + ' ครั้ง</div>' +
      '</div></div></div></div>';
    $('#modalRoot').innerHTML = html;
    paintGallery();
    $('#mClose').onclick = function () { closeModal(); };
    $('#mbg').onclick = function (e) { if (e.target.id === 'mbg') closeModal(); };
    if ($('#gPrev')) { $('#gPrev').onclick = function () { stepImg(-1); }; $('#gNext').onclick = function () { stepImg(1); }; }
    $$('#gThumbs img').forEach(function (t) { t.onclick = function () { S.imgIdx = Number(t.getAttribute('data-i')); paintGallery(); }; });
    if ($('#mPrev')) {
      $('#mPrev').onclick = function () { var n = S.list.length; openWork(S.list[(idx - 1 + n) % n].id); };
      $('#mNext').onclick = function () { openWork(S.list[(idx + 1) % S.list.length].id); };
    }
    $('#schLink').onclick = function (e) { e.preventDefault(); openSchool(r.school); };
    $('#copyLink').onclick = function () {
      U.copy(link).then(function () { U.toast('คัดลอกลิงก์แล้ว', 'ok'); }).catch(function () { $('#shareLink').select(); U.toast('กด Ctrl+C เพื่อคัดลอก'); });
    };
    bindDownloads($('#modalRoot'));
    $$('#modalRoot .gsp-help-link').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); U.gspHelp(); }; });
  }

  init();
})();
