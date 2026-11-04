/* =========================================================
   admin.js — หน้าจัดการสำหรับกรรมการ (ES5)
   ========================================================= */
(function () {
  'use strict';
  var $ = U.$, $$ = U.$$, esc = U.esc;
  var DB = null, CM = {};
  var VIEW = 'dash';
  var RF = { comp: '', q: '' };
  var NAV = {
    dash: ['home', 'แดชบอร์ด'],
    comps: ['calendar', 'รายการแข่งขัน / โจทย์'],
    results: ['trophy', 'ผลการแข่งขัน'],
    'import': ['paste', 'นำเข้าจาก Excel'],
    reports: ['file', 'รายงาน PDF / QR Code'],
    'site-config': ['gear', 'ตั้งค่าระบบ']
  };
  var FILE_KINDS_COMP = ['โจทย์', 'เกณฑ์', 'ไฟล์ตั้งต้น', 'เฉลย', 'อื่นๆ'];
  var FILE_KINDS_RES = ['ไฟล์ GSP', 'เอกสาร', 'วิดีโอนำเสนอ', 'อื่นๆ'];
  var FILE_ACCEPT = '.' + CONFIG.ALLOWED_EXT.join(',.');
  var FILE_HINT = 'รองรับ .gsp (The Geometer\'s Sketchpad) .pdf .docx .pptx .zip .mp4 · ไม่เกิน ' + CONFIG.MAX_UPLOAD_MB + ' MB/ไฟล์';

  /* ================= เริ่มต้น / เข้าสู่ระบบ ================= */
  function init() {
    $('#loginMark').innerHTML = BRAND_MARK;
    $('#sideBrand').innerHTML = BRAND_MARK + '<span class="brand-text">GSP Showcase<small>ระบบจัดการสำหรับกรรมการ</small></span>';
    $$('.side a.nv[data-v]').forEach(function (a) {
      var n = NAV[a.getAttribute('data-v')];
      a.innerHTML = ICON(n[0]) + n[1];
    });
    $('#nvPublic').innerHTML = ICON('globe') + 'ดูหน้าเผยแพร่';
    $('#logoutBtn').innerHTML = ICON('out') + 'ออกจากระบบ';
    if (API.isDemo) {
      $('#demoBar').innerHTML = '<div class="demo-bar">โหมดสาธิต — การเปลี่ยนแปลงถูกเก็บไว้ในเบราว์เซอร์นี้เท่านั้น เปิดหน้าเผยแพร่ในแท็บเดียวกันเพื่อดูผลทันที</div>';
      $('#demoHint').classList.remove('hidden');
    }
    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('#loginBtn');
      busy(btn, true);
      $('#loginErr').classList.add('hidden');
      API.call('login', { password: $('#pw').value }).then(function (d) {
        API.setToken(d.token);
        return load().then(showApp);
      }).catch(function (err) {
        $('#loginErr').textContent = err.message;
        $('#loginErr').classList.remove('hidden');
      }).then(function () { busy(btn, false); });
    });
    $('#logoutBtn').onclick = function (e) {
      e.preventDefault();
      API.call('logout').catch(function () {});
      API.setToken('');
      DB = null;
      showLogin();
    };
    window.addEventListener('hashchange', function () { if (DB) route(); });
    if (API.getToken()) {
      load().then(showApp).catch(showLogin);
    } else showLogin();
  }
  function showLogin() {
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    $('#pw').value = '';
    setTimeout(function () { $('#pw').focus(); }, 50);
  }
  function showApp() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    $('#who').textContent = API.isDemo ? 'กรรมการ (โหมดสาธิต)' : 'กรรมการ';
    route();
  }
  function load() {
    return API.call('getAdmin').then(function (d) {
      DB = d;
      CM = {};
      DB.competitions.sort(function (a, b) { return b.year - a.year || String(a.level).localeCompare(String(b.level)); });
      DB.competitions.forEach(function (c) { CM[c.id] = c; });
      DB.results.sort(function (a, b) { return U.sortResults(a, b, CM); });
    });
  }
  function reload() {
    return load().then(route).catch(handleErr);
  }
  function handleErr(e) {
    if (e && e.code === 'AUTH') { API.setToken(''); showLogin(); U.toast('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่', 'err'); return; }
    U.toast(e && e.message ? e.message : 'เกิดข้อผิดพลาด', 'err');
  }
  function route() {
    var h = location.hash.replace('#', '');
    VIEW = NAV[h] ? h : 'dash';
    $$('.side a.nv[data-v]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-v') === VIEW); });
    var fn = { dash: viewDash, comps: viewComps, results: viewResults, 'import': viewImport, reports: viewReports, 'site-config': viewSettings }[VIEW];
    fn();
    window.scrollTo(0, 0);
  }
  function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }

  /* ================= ตัวช่วย UI ================= */
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.setAttribute('data-l', btn.innerHTML); btn.innerHTML = '<span class="spin"></span> ' + (label || 'กำลังบันทึก...'); btn.disabled = true; }
    else { if (btn.getAttribute('data-l')) btn.innerHTML = btn.getAttribute('data-l'); btn.disabled = false; }
  }
  function modal(o) {
    var root = $('#modalRoot');
    root.innerHTML = '<div class="modal-bg" id="mbg"><div class="modal ' + (o.size || 'md') + '"><div class="modal-head"><h3>' + esc(o.title) + '</h3>' +
      '<button class="icon-btn" id="mX">' + ICON('x') + '</button></div><div class="modal-body">' + o.body + '</div>' +
      (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div></div>';
    document.body.style.overflow = 'hidden';
    $('#mX').onclick = closeModal;
    if (o.onMount) o.onMount(root);
    return root;
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }
  function confirmBox(msg, ok, danger) {
    return new Promise(function (resolve) {
      modal({
        title: 'ยืนยันการทำรายการ', size: 'sm', body: '<p style="margin:0">' + msg + '</p>',
        foot: '<button class="btn" id="cNo">ยกเลิก</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" id="cYes">' + esc(ok || 'ยืนยัน') + '</button>',
        onMount: function () {
          $('#cNo').onclick = function () { closeModal(); resolve(false); };
          $('#mX').onclick = function () { closeModal(); resolve(false); };
          $('#cYes').onclick = function () { closeModal(); resolve(true); };
        }
      });
    });
  }
  function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
  function splitList(s) { return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; }); }
  function compLabel(c) { return c ? 'ปี ' + c.year + ' · ' + c.level + ' · ' + c.stage : '(ไม่พบรายการ)'; }
  function compOptions(cur, allLabel) {
    return (allLabel ? opt('', allLabel, cur) : '') + DB.competitions.map(function (c) { return opt(c.id, compLabel(c), cur); }).join('');
  }
  function resultsOf(cid) { return DB.results.filter(function (r) { return r.competitionId === cid; }); }
  function pageHead(title, sub, actions) {
    return '<div class="page-head"><div><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' + (actions || '') + '</div></div>';
  }
  function switchHtml(type, id, on) {
    return '<label class="switch" title="เผยแพร่"><input type="checkbox" data-pub="' + type + '" data-id="' + esc(id) + '"' + (on ? ' checked' : '') + '><span></span></label>';
  }
  function bindSwitches(root) {
    $$('input[data-pub]', root).forEach(function (cb) {
      cb.onchange = function () {
        var type = cb.getAttribute('data-pub'), id = cb.getAttribute('data-id');
        API.call('setPublished', { type: type, id: id, published: cb.checked }).then(function () {
          var arr = type === 'competition' ? DB.competitions : DB.results;
          arr.forEach(function (x) { if (x.id === id) x.published = cb.checked; });
          U.toast(cb.checked ? 'เผยแพร่แล้ว' : 'ซ่อนจากหน้าเผยแพร่แล้ว', 'ok');
        }).catch(function (e) { cb.checked = !cb.checked; handleErr(e); });
      };
    });
  }

  /* ---------- กล่องอัปโหลดไฟล์ ---------- */
  function Uploader(el, items, o) {
    var list = (items || []).slice(), pending = 0;
    el.innerHTML = '<div class="drop" tabindex="0">' + ICON('upload') + ' ' + esc(o.label) +
      '<div style="font-size:12px;margin-top:2px">' + esc(o.hint || ('ลากไฟล์มาวาง หรือคลิกเพื่อเลือก · ไม่เกิน ' + CONFIG.MAX_UPLOAD_MB + ' MB/ไฟล์')) + '</div></div>' +
      '<input type="file" class="hidden"' + (o.accept ? ' accept="' + o.accept + '"' : '') + ' multiple><div class="up-list' + (o.image ? '' : ' files') + '"></div>';
    var drop = $('.drop', el), inp = $('input[type=file]', el), box = $('.up-list', el);
    function paint() {
      box.innerHTML = list.map(function (f, i) {
        if (o.image) {
          return '<div class="up-item"><img alt="" src="' + esc(U.imgSrc(f, 300)) + '">' + (i === 0 ? '<span class="cover">ภาพปก</span>' : '') +
            '<button type="button" class="x" data-i="' + i + '" title="ลบ">×</button>' +
            (i > 0 ? '<button type="button" class="x" data-c="' + i + '" title="ตั้งเป็นภาพปก" style="right:32px;font-size:11px">★</button>' : '') + '</div>';
        }
        return '<div class="up-item"><div class="file' + (U.isGsp(f.name) ? ' gspf' : '') + '"><span class="ext ' + U.extCls(f.name) + '">' + esc(U.ext(f.name).slice(0, 4)) + '</span>' +
          '<span class="fn"><b>' + esc(f.name) + '</b><small>' + U.fmtSize(f.size) + (U.isGsp(f.name) ? ' · ไฟล์ The Geometer\'s Sketchpad' : '') + '</small></span>' +
          (o.kinds ? '<select class="select" style="width:auto;padding:5px 8px;font-size:13px" data-k="' + i + '">' + o.kinds.map(function (k) { return opt(k, k, f.kind); }).join('') + '</select>' : '') +
          '<button type="button" class="x icon-btn" data-i="' + i + '" title="ลบ">' + ICON('trash') + '</button></div></div>';
      }).join('') + (pending ? '<div class="up-item loading"><span><span class="spin"></span> กำลังอัปโหลด ' + pending + ' ไฟล์</span></div>' : '');
      $$('[data-i]', box).forEach(function (b) { b.onclick = function () { list.splice(Number(b.getAttribute('data-i')), 1); paint(); }; });
      $$('[data-c]', box).forEach(function (b) { b.onclick = function () { var i = Number(b.getAttribute('data-c')); list.unshift(list.splice(i, 1)[0]); paint(); }; });
      $$('[data-k]', box).forEach(function (s) { s.onchange = function () { list[Number(s.getAttribute('data-k'))].kind = s.value; }; });
      if (o.onChange) o.onChange(list);
    }
    function add(files) {
      Array.prototype.slice.call(files).forEach(function (file) {
        if (o.image && !/^image\//.test(file.type)) { U.toast(file.name + ' ไม่ใช่ไฟล์รูปภาพ', 'err'); return; }
        pending++; paint();
        var kind = o.kinds ? guessKind(file.name, o.kinds) : '';
        API.upload(file, o.folder, kind).then(function (meta) { list.push(meta); })
          .catch(handleErr).then(function () { pending--; paint(); });
      });
    }
    drop.onclick = function () { inp.click(); };
    drop.onkeydown = function (e) { if (e.key === 'Enter') inp.click(); };
    inp.onchange = function () { add(inp.files); inp.value = ''; };
    drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = function () { drop.classList.remove('over'); };
    drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer.files); };
    paint();
    return { get: function () { return list.slice(); }, pending: function () { return pending; } };
  }
  function guessKind(name, kinds) {
    var n = name.toLowerCase(), e = U.ext(name);
    if (kinds === FILE_KINDS_COMP) {
      if (/เกณฑ์|rubric|criteria/.test(n)) return 'เกณฑ์';
      if (/เฉลย|answer|solution/.test(n)) return 'เฉลย';
      if (U.isGsp(name)) return 'ไฟล์ตั้งต้น';
      return 'โจทย์';
    }
    if (U.isGsp(name)) return 'ไฟล์ GSP';
    if (/^(mp4|mov|avi|mkv)$/.test(e)) return 'วิดีโอนำเสนอ';
    return 'เอกสาร';
  }
  /* ---------- ช่องกรอกหลายชื่อ ---------- */
  function MultiInput(el, values, o) {
    var vals = (values && values.length ? values : ['']).slice();
    while (vals.length < (o.min || 1)) vals.push('');
    function paint() {
      el.innerHTML = '<div class="multi">' + vals.map(function (v, i) {
        return '<div class="r"><input class="input" data-m="' + i + '" value="' + esc(v) + '" placeholder="' + esc(o.ph + ' คนที่ ' + (i + 1)) + '"' + (o.list ? ' list="' + o.list + '"' : '') + '>' +
          (vals.length > 1 ? '<button type="button" class="icon-btn" data-rm="' + i + '" title="ลบ">' + ICON('x') + '</button>' : '') + '</div>';
      }).join('') + '<button type="button" class="btn btn-sm btn-ghost" data-add style="align-self:flex-start">' + ICON('plus') + 'เพิ่มชื่อ</button></div>';
      $$('[data-m]', el).forEach(function (inp) { inp.oninput = function () { vals[Number(inp.getAttribute('data-m'))] = inp.value; }; });
      $$('[data-rm]', el).forEach(function (b) { b.onclick = function () { vals.splice(Number(b.getAttribute('data-rm')), 1); paint(); }; });
      $('[data-add]', el).onclick = function () { vals.push(''); paint(); };
    }
    paint();
    return { get: function () { return vals.map(function (v) { return v.trim(); }).filter(function (v) { return v; }); } };
  }

  /* ================= แดชบอร์ด ================= */
  function viewDash() {
    var R = DB.results, pub = R.filter(function (r) { return r.published; }).length, views = 0, dls = 0;
    R.forEach(function (r) { views += Number(r.views) || 0; dls += Number(r.downloads) || 0; });
    var todo = [];
    DB.competitions.forEach(function (c) {
      if (!(c.files || []).length) todo.push({ t: 'ยังไม่มีไฟล์โจทย์', d: compLabel(c), act: 'comp', id: c.id });
      if (!resultsOf(c.id).length) todo.push({ t: 'ยังไม่ได้ลงผลการแข่งขัน', d: compLabel(c), act: 'res', id: c.id });
    });
    R.forEach(function (r) {
      if (!(r.images || []).length) todo.push({ t: 'ผลงานยังไม่มีรูปภาพ', d: 'อันดับ ' + r.rank + ' · ' + r.school + ' (' + compLabel(CM[r.competitionId]) + ')', act: 'edit', id: r.id });
      else if (!(r.files || []).length) todo.push({ t: 'ผลงานยังไม่มีไฟล์ GSP', d: 'อันดับ ' + r.rank + ' · ' + r.school + ' (' + compLabel(CM[r.competitionId]) + ')', act: 'edit', id: r.id });
    });
    var A = Stats.compute(DB.competitions, R, DB.settings), CC = Charts.C;
    var top = R.slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); }).slice(0, 5);
    $('#view').innerHTML = pageHead('แดชบอร์ด', 'ภาพรวมข้อมูลในระบบ',
      '<button class="btn" id="dAddC">' + ICON('plus') + 'รายการแข่งขัน</button><button class="btn btn-primary" id="dAddR">' + ICON('plus') + 'ลงผลการแข่งขัน</button>') +
      '<div class="kpis">' +
      '<div class="kpi glow"><span>รายการแข่งขัน</span><b>' + DB.competitions.length + '</b><span>' + uniqYears().length + ' ปีการศึกษา</span></div>' +
      '<div class="kpi glow"><span>ผลงานทั้งหมด</span><b>' + R.length + '</b><span>เผยแพร่ ' + pub + ' · ซ่อน ' + (R.length - pub) + '</span></div>' +
      '<div class="kpi glow"><span>ยอดเข้าชมผลงาน</span><b>' + views.toLocaleString('th-TH') + '</b><span>ครั้ง</span></div>' +
      '<div class="kpi glow"><span>ยอดดาวน์โหลดไฟล์</span><b>' + dls.toLocaleString('th-TH') + '</b><span>ครั้ง · ไฟล์ GSP ' + A.gsp + ' ไฟล์</span></div></div>' +
      '<div class="bp"><div class="tw-grid tw-grid-cols-1 lg:tw-grid-cols-3 tw-gap-4">' +
      '<div class="bp-card glow"><h3>สัดส่วนเหรียญ <span class="m">ทั้งหมด</span></h3>' + Charts.donut([
        { label: 'ทอง', value: A.medals['ทอง'], color: CC.gold }, { label: 'เงิน', value: A.medals['เงิน'], color: CC.silver },
        { label: 'ทองแดง', value: A.medals['ทองแดง'], color: CC.bronze }, { label: 'เข้าร่วม', value: A.medals['เข้าร่วม'], color: CC.none }], { unit: 'ผลงาน' }) + '</div>' +
      '<div class="bp-card glow lg:tw-col-span-2"><h3>ผลงานและเหรียญรายปี</h3>' + Charts.stack({
        labels: A.years.map(function (y) { return String(y.year); }),
        stacks: [
          { name: 'ทอง', color: CC.gold, values: A.years.map(function (y) { return y.medals['ทอง']; }) },
          { name: 'เงิน', color: CC.silver, values: A.years.map(function (y) { return y.medals['เงิน']; }) },
          { name: 'ทองแดง', color: CC.bronze, values: A.years.map(function (y) { return y.medals['ทองแดง']; }) },
          { name: 'เข้าร่วม', color: CC.none, values: A.years.map(function (y) { return y.medals['เข้าร่วม']; }) }] }) + '</div></div>' +
      '<div class="bp-card tw-mt-4"><h3>สรุปการแข่งขันรายปี <span class="m">เทียบปีก่อน</span></h3><div class="tbl-wrap"><table class="year-tbl"><thead><tr><th>ปีการศึกษา</th><th>รายการ</th><th>ทีม</th><th>โรงเรียน</th><th>นักเรียน</th><th>ครู</th><th>คะแนนเฉลี่ย</th><th>สูงสุด</th><th style="color:' + CC.gold + '">ทอง</th><th style="color:' + CC.silver + '">เงิน</th><th style="color:' + CC.bronze + '">ทองแดง</th><th>ไฟล์ GSP</th><th>เข้าชม</th></tr></thead><tbody>' +
      A.years.slice().reverse().map(function (y, i, arr) {
        var p = arr[i + 1];
        return '<tr><td>' + y.year + '</td><td>' + y.levelList.length + '</td><td>' + y.teams + (p ? Stats.delta(y.teams, p.teams) : '') + '</td><td>' + y.schoolCount + '</td><td>' + y.students + '</td><td>' + y.coachCount +
          '</td><td>' + (y.avg === null ? '-' : y.avg.toFixed(2)) + (p ? Stats.delta(y.avg, p.avg, 2) : '') + '</td><td>' + (y.max === null ? '-' : y.max) + '</td><td>' + y.medals['ทอง'] + '</td><td>' + y.medals['เงิน'] + '</td><td>' + y.medals['ทองแดง'] +
          '</td><td>' + y.gsp + '</td><td>' + y.views + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>' +
      '<div class="stat-grid"><div class="panel glow"><h3>รายการที่ควรเติมข้อมูล <span class="tag ' + (todo.length ? 'red' : 'green') + '">' + todo.length + '</span></h3>' +
      (todo.length ? '<div>' + todo.slice(0, 8).map(function (t, i) {
        return '<div class="log" style="align-items:center"><div style="flex:1"><b style="font-weight:600">' + esc(t.t) + '</b><br><span class="muted">' + esc(t.d) + '</span></div><button class="btn btn-sm" data-todo="' + i + '">จัดการ</button></div>';
      }).join('') + (todo.length > 8 ? '<div class="muted" style="font-size:13px;padding-top:8px">และอีก ' + (todo.length - 8) + ' รายการ</div>' : '') + '</div>' :
        '<div class="empty">ข้อมูลครบถ้วนแล้ว 🎉</div>') + '</div>' +
      '<div class="panel"><h3>ผลงานที่มีผู้เข้าชมมากที่สุด</h3>' + top.map(function (r) {
        return '<div class="log" style="align-items:center">' + U.rankBadge(r.rank) + '<div style="flex:1;min-width:0"><b style="font-weight:600">' + esc(r.title) + '</b><br><span class="muted">' + esc(r.school) + '</span></div><span class="mono">' + (r.views || 0) + '</span></div>';
      }).join('') + '</div></div>' +
      '<div class="panel" style="margin-top:18px"><h3>ประวัติการทำงานล่าสุด</h3>' + (DB.logs || []).slice(0, 10).map(function (l) {
        return '<div class="log"><time>' + esc(U.fmtDateTime(l.at)) + '</time><span>' + esc(l.detail) + '</span></div>';
      }).join('') + '</div>';
    $('#dAddC').onclick = function () { compForm(null); };
    $('#dAddR').onclick = function () { resultForm(null, RF.comp || (DB.competitions[0] || {}).id); };
    $$('[data-todo]').forEach(function (b) {
      b.onclick = function () {
        var t = todo[Number(b.getAttribute('data-todo'))];
        if (t.act === 'comp') compForm(CM[t.id]);
        else if (t.act === 'res') { RF.comp = t.id; go('results'); }
        else resultForm(findResult(t.id));
      };
    });
  }
  function uniqYears() { var o = {}; DB.competitions.forEach(function (c) { o[c.year] = 1; }); return Object.keys(o); }
  function findResult(id) { var r = null; DB.results.forEach(function (x) { if (x.id === id) r = x; }); return r; }

  /* ================= รายการแข่งขัน ================= */
  function viewComps() {
    var byYear = {}, ys = [];
    DB.competitions.forEach(function (c) { if (!byYear[c.year]) { byYear[c.year] = []; ys.push(c.year); } byYear[c.year].push(c); });
    $('#view').innerHTML = pageHead('รายการแข่งขัน / โจทย์', 'แต่ละปีการศึกษา แยกตามระดับชั้นและระดับการแข่งขัน พร้อมไฟล์โจทย์ให้ดาวน์โหลด',
      '<button class="btn btn-primary" id="cAdd">' + ICON('plus') + 'เพิ่มรายการแข่งขัน</button>') +
      (ys.length ? ys.map(function (y) {
        return '<div class="comp-year">ปีการศึกษา ' + y + '</div><div class="panel" style="padding:0;overflow:hidden"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ระดับชั้น</th><th>ระดับการแข่งขัน</th><th>วันที่</th><th>หัวข้อโจทย์</th><th>ผลงาน</th><th>ไฟล์</th><th>เผยแพร่</th><th></th></tr></thead><tbody>' +
          byYear[y].map(function (c) {
            return '<tr><td><b>' + esc(c.level) + '</b></td><td>' + esc(c.stage) + '</td><td>' + U.fmtDate(c.date) + '</td><td style="max-width:280px">' + esc(c.theme || '-') +
              '</td><td><a href="#results" data-goto="' + esc(c.id) + '">' + resultsOf(c.id).length + ' ผลงาน</a></td><td>' + (c.files || []).length +
              '</td><td>' + switchHtml('competition', c.id, c.published) + '</td><td><div class="row-actions">' +
              '<button class="btn btn-sm" data-next="' + esc(c.id) + '" title="สร้างรายการเดียวกันสำหรับปีถัดไป">+ ปี ' + (Number(c.year) + 1) + '</button>' +
              '<button class="icon-btn" data-edit="' + esc(c.id) + '" title="แก้ไข">' + ICON('edit') + '</button>' +
              '<button class="icon-btn btn-danger" data-del="' + esc(c.id) + '" title="ลบ">' + ICON('trash') + '</button></div></td></tr>';
          }).join('') + '</tbody></table></div></div>';
      }).join('') : '<div class="empty">ยังไม่มีรายการแข่งขัน — เริ่มจากเพิ่มรายการของปีการศึกษาแรก</div>');
    $('#cAdd').onclick = function () { compForm(null); };
    bindSwitches($('#view'));
    $$('[data-edit]').forEach(function (b) { b.onclick = function () { compForm(CM[b.getAttribute('data-edit')]); }; });
    $$('[data-goto]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); RF.comp = a.getAttribute('data-goto'); go('results'); }; });
    $$('[data-next]').forEach(function (b) {
      b.onclick = function () {
        var c = U.clone(CM[b.getAttribute('data-next')]);
        delete c.id; c.year = Number(c.year) + 1; c.files = []; c.theme = ''; c.date = ''; c.published = false;
        c.title = defaultTitle(c.level);
        compForm(c, true);
      };
    });
    $$('[data-del]').forEach(function (b) {
      b.onclick = function () {
        var c = CM[b.getAttribute('data-del')];
        confirmBox('ลบรายการ <b>' + esc(compLabel(c)) + '</b> ?<br><span class="muted">ต้องลบผลการแข่งขันในรายการนี้ให้หมดก่อน</span>', 'ลบรายการ', true).then(function (ok) {
          if (!ok) return;
          API.call('deleteCompetition', { id: c.id }).then(function () { U.toast('ลบแล้ว', 'ok'); reload(); }).catch(handleErr);
        });
      };
    });
  }
  function defaultTitle(level) { return 'การแข่งขันสร้างสรรค์ผลงานคณิตศาสตร์โดยใช้โปรแกรม GSP ระดับชั้น ' + level; }
  function compForm(c, isCopy) {
    var isNew = !c || !c.id;
    c = c || { year: new Date().getFullYear() + 543 - (new Date().getMonth() < 4 ? 1 : 0), level: splitList(DB.settings.levels)[0] || 'ป.4-6', stage: splitList(DB.settings.stages)[0] || '', files: [], published: false };
    var levels = splitList(DB.settings.levels), stages = splitList(DB.settings.stages);
    if (c.level && levels.indexOf(c.level) < 0) levels.push(c.level);
    if (c.stage && stages.indexOf(c.stage) < 0) stages.push(c.stage);
    var up;
    modal({
      title: isNew ? (isCopy ? 'สร้างรายการแข่งขันปีถัดไป' : 'เพิ่มรายการแข่งขัน') : 'แก้ไขรายการแข่งขัน', size: 'md',
      body: '<form id="cf" class="grid-3">' +
        '<div class="form-sec">ข้อมูลการแข่งขัน</div>' +
        '<div class="field"><label>ปีการศึกษา *</label><input class="input" type="number" id="cYear" value="' + esc(c.year) + '" min="2500" max="2700" required></div>' +
        '<div class="field"><label>ระดับชั้น *</label><select class="select" id="cLevel">' + levels.map(function (l) { return opt(l, l, c.level); }).join('') + '</select></div>' +
        '<div class="field"><label>ระดับการแข่งขัน *</label><select class="select" id="cStage">' + stages.map(function (s) { return opt(s, s, c.stage); }).join('') + '</select></div>' +
        '<div class="field span-3"><label>ชื่อรายการ</label><input class="input" id="cTitle" value="' + esc(c.title || '') + '" placeholder="' + esc(defaultTitle(c.level)) + '"><span class="hint">เว้นว่างไว้ ระบบจะตั้งชื่อให้อัตโนมัติ</span></div>' +
        '<div class="field"><label>วันที่แข่งขัน</label><input class="input" type="date" id="cDate" value="' + esc(c.date || '') + '"></div>' +
        '<div class="field span-2"><label>สถานที่แข่งขัน</label><input class="input" id="cVenue" value="' + esc(c.venue || '') + '"></div>' +
        '<div class="form-sec">โจทย์การแข่งขัน</div>' +
        '<div class="field span-3"><label>หัวข้อ / โจทย์ที่กำหนด</label><input class="input" id="cTheme" value="' + esc(c.theme || '') + '" placeholder="เช่น ลวดลายไทยด้วยการหมุนและการสะท้อน"></div>' +
        '<div class="field span-3"><label>รายละเอียด / กติกาโดยย่อ</label><textarea class="textarea" id="cDesc">' + esc(c.description || '') + '</textarea></div>' +
        '<div class="field span-3"><label>ไฟล์โจทย์ เกณฑ์ ไฟล์ตั้งต้น (.pdf .gsp .docx ฯลฯ)</label><div id="cFiles"></div></div>' +
        '<div class="span-3"><label class="check"><input type="checkbox" id="cPub"' + (c.published ? ' checked' : '') + '> เผยแพร่รายการนี้บนหน้าสาธารณะ</label></div>' +
        '</form>',
      foot: '<button class="btn" id="cCancel">ยกเลิก</button><button class="btn btn-primary" id="cSave">บันทึก</button>',
      onMount: function () {
        up = Uploader($('#cFiles'), c.files, { label: 'อัปโหลดไฟล์โจทย์ / ไฟล์ตั้งต้น .gsp', folder: 'problems', kinds: FILE_KINDS_COMP, accept: FILE_ACCEPT, hint: FILE_HINT });
        $('#cLevel').onchange = function () { $('#cTitle').placeholder = defaultTitle(this.value); };
        $('#cCancel').onclick = closeModal;
        $('#cSave').onclick = function () {
          if (up.pending()) { U.toast('รอให้อัปโหลดไฟล์เสร็จก่อน', 'err'); return; }
          var y = Number($('#cYear').value);
          if (!y) { U.toast('กรุณาระบุปีการศึกษา', 'err'); return; }
          var lv = $('#cLevel').value, st = $('#cStage').value;
          var dup = DB.competitions.filter(function (x) { return x.id !== c.id && Number(x.year) === y && x.level === lv && x.stage === st; });
          if (dup.length) { U.toast('มีรายการ ปี ' + y + ' ' + lv + ' ' + st + ' อยู่แล้ว', 'err'); return; }
          var data = {
            id: c.id || '', year: y, level: lv, stage: st,
            title: $('#cTitle').value.trim() || defaultTitle(lv), date: $('#cDate').value, venue: $('#cVenue').value.trim(),
            theme: $('#cTheme').value.trim(), description: $('#cDesc').value.trim(), files: up.get(), published: $('#cPub').checked,
            createdAt: c.createdAt || ''
          };
          var btn = this; busy(btn, true);
          API.call('saveCompetition', data).then(function () { closeModal(); U.toast('บันทึกรายการแข่งขันแล้ว', 'ok'); reload(); })
            .catch(function (e) { busy(btn, false); handleErr(e); });
        };
      }
    });
  }

  /* ================= ผลการแข่งขัน ================= */
  function viewResults() {
    if (RF.comp && !CM[RF.comp]) RF.comp = '';
    $('#view').innerHTML = pageHead('ผลการแข่งขัน', 'ลงผลงานนักเรียนอันดับ 1, 2, 3, 4 ... พร้อมรูปภาพและไฟล์ผลงาน',
      '<button class="btn" id="rImport">' + ICON('paste') + 'นำเข้าจาก Excel</button><button class="btn btn-primary" id="rAdd">' + ICON('plus') + 'เพิ่มผลงาน</button>') +
      '<div class="toolbar"><select class="select" id="rComp" style="width:auto;min-width:260px">' + compOptions(RF.comp, 'ทุกรายการแข่งขัน') + '</select>' +
      '<div class="search">' + ICON('search') + '<input class="input" id="rQ" placeholder="ค้นหาชื่อผลงาน โรงเรียน นักเรียน" value="' + esc(RF.q) + '"></div>' +
      '<span id="rTools" style="display:flex;gap:8px;flex-wrap:wrap"></span></div>' +
      '<div class="panel" style="padding:0;overflow:hidden" id="rTable"></div>';
    $('#rComp').onchange = function () { RF.comp = this.value; paintResults(); };
    var t = null;
    $('#rQ').oninput = function () { var v = this.value; clearTimeout(t); t = setTimeout(function () { RF.q = v.trim(); paintResults(); }, 200); };
    $('#rAdd').onclick = function () { resultForm(null, RF.comp || (DB.competitions[0] || {}).id); };
    $('#rImport').onclick = function () { go('import'); };
    paintResults();
  }
  function paintTools() {
    var box = $('#rTools');
    if (!box) return;
    box.innerHTML = RF.comp ? '<button class="btn btn-sm" id="tRank" title="คำนวณอันดับใหม่จากคะแนนมากไปน้อย">' + ICON('trophy') + 'เรียงอันดับจากคะแนน</button>' +
      '<button class="btn btn-sm" id="tCopy" title="คัดลอกไปวางใน Excel / Google Sheets">' + ICON('paste') + 'คัดลอกเป็นตาราง Excel</button>' +
      '<button class="btn btn-sm" id="tPdf">' + ICON('file') + 'ประกาศผล PDF</button>' : '<span class="muted" style="font-size:13px">เลือกรายการแข่งขันเพื่อใช้เครื่องมือเรียงอันดับ / คัดลอก / ประกาศผล</span>';
    if (!RF.comp) return;
    $('#tRank').onclick = autoRank;
    $('#tCopy').onclick = copyTSV;
    $('#tPdf').onclick = function () { Report.open('ประกาศผล ' + compLabel(CM[RF.comp]), Report.announce(Report.ctx(DB.settings, DB.competitions, DB.results), [RF.comp])); };
  }
  /* เรียงอันดับใหม่จากคะแนน (คะแนนเท่ากันได้อันดับร่วม 1,2,2,4) */
  function autoRank() {
    var rows = resultsOf(RF.comp);
    var scored = rows.filter(function (r) { return r.score !== '' && r.score !== null && !isNaN(Number(r.score)); });
    var rest = rows.filter(function (r) { return scored.indexOf(r) < 0; }).sort(function (a, b) { return a.rank - b.rank; });
    if (!scored.length) { U.toast('ยังไม่มีคะแนนให้เรียง', 'err'); return; }
    scored.sort(function (a, b) { return Number(b.score) - Number(a.score); });
    var plan = [];
    scored.forEach(function (r) {
      var higher = scored.filter(function (x) { return Number(x.score) > Number(r.score); }).length;
      plan.push({ r: r, rank: higher + 1 });
    });
    rest.forEach(function (r, i) { plan.push({ r: r, rank: scored.length + i + 1 }); });
    var changed = plan.filter(function (p) { return Number(p.r.rank) !== p.rank; });
    if (!changed.length) { U.toast('อันดับตรงกับคะแนนอยู่แล้ว', 'ok'); return; }
    modal({
      title: 'เรียงอันดับจากคะแนน', size: 'md',
      body: '<p style="margin-top:0">อันดับที่จะเปลี่ยน ' + changed.length + ' รายการ (คะแนนเท่ากันได้อันดับร่วม)</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>โรงเรียน</th><th>คะแนน</th><th>อันดับเดิม</th><th>อันดับใหม่</th></tr></thead><tbody>' +
        plan.map(function (p) {
          var ch = Number(p.r.rank) !== p.rank;
          return '<tr' + (ch ? ' style="background:var(--gold-soft)"' : '') + '><td>' + esc(p.r.school) + '</td><td class="mono">' + esc(p.r.score) + '</td><td>' + esc(p.r.rank) + '</td><td><b>' + p.rank + '</b>' + (ch ? ' ←' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>',
      foot: '<button class="btn" id="arNo">ยกเลิก</button><button class="btn btn-primary" id="arYes">ยืนยันเรียงอันดับ</button>',
      onMount: function () {
        $('#arNo').onclick = closeModal;
        $('#arYes').onclick = function () {
          var btn = this; busy(btn, true);
          API.call('reorderRanks', { competitionId: RF.comp, ranks: changed.map(function (p) { return { id: p.r.id, rank: p.rank }; }) })
            .then(function () { closeModal(); U.toast('เรียงอันดับแล้ว', 'ok'); reload(); })
            .catch(function (e) { busy(btn, false); handleErr(e); });
        };
      }
    });
  }
  function copyTSV() {
    var rows = resultsOf(RF.comp).slice().sort(function (a, b) { return a.rank - b.rank; });
    var clean = function (x) { return String(x === undefined || x === null ? '' : x).replace(/[\t\r\n]+/g, ' '); };
    var lines = ['อันดับ\tโรงเรียน\tนักเรียน 1\tนักเรียน 2\tครูผู้ฝึกสอน 1\tครูผู้ฝึกสอน 2\tคะแนน\tชื่อผลงาน\tเหรียญ\tรางวัล'];
    rows.forEach(function (r) {
      var st = r.students || [], co = r.coaches || [];
      lines.push([r.rank, r.school, st[0], st[1], co[0], co[1], r.score, r.title, U.medalOf(r, DB.settings), U.rankLabel(r.rank)].map(clean).join('\t'));
    });
    var txt = lines.join('\n');
    U.copy(txt).then(function () { U.toast('คัดลอก ' + rows.length + ' แถวแล้ว — วางใน Excel ได้เลย (Ctrl+V)', 'ok'); }).catch(function () {
      modal({ title: 'คัดลอกตาราง', size: 'md', body: '<textarea class="textarea mono" style="min-height:240px;font-size:12px" id="tsvBox">' + esc(txt) + '</textarea><p class="muted" style="font-size:13px">เลือกทั้งหมด (Ctrl+A) แล้วคัดลอก (Ctrl+C)</p>',
        onMount: function () { $('#tsvBox').select(); } });
    });
  }
  function paintResults() {
    paintTools();
    var q = RF.q.toLowerCase();
    var list = DB.results.filter(function (r) {
      if (RF.comp && r.competitionId !== RF.comp) return false;
      if (q && [r.title, r.school, (r.students || []).join(' ')].join(' ').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    if (!list.length) {
      $('#rTable').innerHTML = '<div class="empty" style="border:0">ยังไม่มีผลงาน' + (RF.comp ? 'ในรายการนี้' : '') + '</div>';
      return;
    }
    var ranks = {}, dupes = {};
    list.forEach(function (r) { var k = r.competitionId + '_' + r.rank; if (ranks[k]) dupes[k] = 1; ranks[k] = 1; });
    $('#rTable').innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>อันดับ</th><th>ผลงาน / โรงเรียน</th>' + (RF.comp ? '' : '<th>รายการ</th>') +
      '<th>นักเรียน</th><th>คะแนน</th><th>เหรียญ</th><th>ไฟล์</th><th>' + ICON('eye') + '</th><th>เผยแพร่</th><th></th></tr></thead><tbody>' +
      list.map(function (r) {
        var c = CM[r.competitionId] || {}, img = (r.images || [])[0], dup = dupes[r.competitionId + '_' + r.rank];
        return '<tr><td>' + (img ? '<img class="thumb-sm" alt="" src="' + esc(U.imgSrc(img, 200)) + '">' : '<div class="thumb-sm"></div>') + '</td>' +
          '<td>' + U.rankBadge(r.rank) + (dup ? '<br><span class="tag red" title="อันดับซ้ำ">ซ้ำ</span>' : '') + '</td>' +
          '<td><b style="font-weight:600">' + esc(r.title || '(ไม่ระบุชื่อผลงาน)') + '</b>' + (r.advance ? ' <span class="tag green">ตัวแทน</span>' : '') + '<br><span class="muted">' + esc(r.school) + '</span></td>' +
          (RF.comp ? '' : '<td class="muted" style="font-size:13px">' + esc(c.year) + '<br>' + esc(c.level) + '</td>') +
          '<td style="font-size:13px">' + (r.students || []).map(esc).join('<br>') + '</td>' +
          '<td class="mono">' + esc(r.score) + '</td><td>' + U.medalTag(U.medalOf(r, DB.settings)) + '</td>' +
          '<td class="muted" style="font-size:13px">' + (r.images || []).length + ' รูป<br>' + (r.files || []).length + ' ไฟล์</td>' +
          '<td class="mono muted">' + (r.views || 0) + '</td><td>' + switchHtml('result', r.id, r.published) + '</td>' +
          '<td><div class="row-actions"><button class="icon-btn" data-edit="' + esc(r.id) + '" title="แก้ไข">' + ICON('edit') + '</button>' +
          '<button class="icon-btn btn-danger" data-del="' + esc(r.id) + '" title="ลบ">' + ICON('trash') + '</button></div></td></tr>';
      }).join('') + '</tbody></table></div>';
    bindSwitches($('#rTable'));
    $$('#rTable [data-edit]').forEach(function (b) { b.onclick = function () { resultForm(findResult(b.getAttribute('data-edit'))); }; });
    $$('#rTable [data-del]').forEach(function (b) {
      b.onclick = function () {
        var r = findResult(b.getAttribute('data-del'));
        confirmBox('ลบผลงาน <b>' + esc(r.title || r.school) + '</b> (อันดับ ' + esc(r.rank) + ') ?<br><span class="muted">รูปภาพและไฟล์ที่แนบจะถูกย้ายไปถังขยะของ Drive</span>', 'ลบผลงาน', true).then(function (ok) {
          if (!ok) return;
          API.call('deleteResult', { id: r.id }).then(function () { U.toast('ลบแล้ว', 'ok'); reload(); }).catch(handleErr);
        });
      };
    });
  }
  function nextRank(cid) {
    var m = 0;
    resultsOf(cid).forEach(function (r) { if (Number(r.rank) > m) m = Number(r.rank); });
    return m + 1;
  }
  function resultForm(r, cid) {
    if (!DB.competitions.length) { U.toast('กรุณาเพิ่มรายการแข่งขันก่อน', 'err'); go('comps'); return; }
    var isNew = !r;
    cid = (r && r.competitionId) || cid || DB.competitions[0].id;
    r = r || { competitionId: cid, rank: nextRank(cid), students: [], coaches: [], images: [], files: [], medal: '', published: true, score: '' };
    var schools = {}; DB.results.forEach(function (x) { schools[x.school] = 1; });
    var coaches = {}; DB.results.forEach(function (x) { (x.coaches || []).forEach(function (n) { coaches[n] = 1; }); });
    var imgUp, fileUp, stuIn, coIn;
    modal({
      title: isNew ? 'เพิ่มผลการแข่งขัน' : 'แก้ไขผลการแข่งขัน', size: 'md',
      body: '<form id="rf" class="grid-3">' +
        '<datalist id="dlSchools">' + Object.keys(schools).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
        '<datalist id="dlCoaches">' + Object.keys(coaches).map(function (s) { return '<option value="' + esc(s) + '">'; }).join('') + '</datalist>' +
        '<div class="form-sec">ผลการแข่งขัน</div>' +
        '<div class="field span-3"><label>รายการแข่งขัน *</label><select class="select" id="fComp">' + compOptions(r.competitionId) + '</select></div>' +
        '<div class="field"><label>อันดับที่ *</label><input class="input" type="number" min="1" id="fRank" value="' + esc(r.rank) + '"><span class="hint" id="fRankLbl"></span></div>' +
        '<div class="field"><label>คะแนน</label><input class="input" type="number" step="0.01" min="0" max="100" id="fScore" value="' + esc(r.score) + '"></div>' +
        '<div class="field"><label>เหรียญรางวัล</label><select class="select" id="fMedal">' + opt('', 'คำนวณจากคะแนน', r.medal) + ['ทอง', 'เงิน', 'ทองแดง', 'เข้าร่วม'].map(function (m) { return opt(m, m, r.medal); }).join('') + '</select><span class="hint" id="fMedalLbl"></span></div>' +
        '<div class="span-3"><label class="check"><input type="checkbox" id="fAdv"' + (r.advance ? ' checked' : '') + '> ได้เป็นตัวแทนเข้าแข่งขันระดับถัดไป</label></div>' +
        '<div class="form-sec">ผู้เข้าแข่งขัน</div>' +
        '<div class="field span-3"><label>โรงเรียน *</label><input class="input" id="fSchool" list="dlSchools" value="' + esc(r.school || '') + '"></div>' +
        '<div class="field"><label>นักเรียน *</label><div id="fStu"></div></div>' +
        '<div class="field span-2"><label>ครูผู้ฝึกสอน</label><div id="fCoach"></div></div>' +
        '<div class="form-sec">ผลงาน</div>' +
        '<div class="field span-3"><label>ชื่อผลงาน</label><input class="input" id="fTitle" value="' + esc(r.title || '') + '"></div>' +
        '<div class="field span-3"><label>คำอธิบาย / แนวคิด / ขั้นตอนการสร้าง</label><textarea class="textarea" id="fDesc">' + esc(r.description || '') + '</textarea></div>' +
        '<div class="field span-3"><label>รูปภาพผลงาน (ภาพแรก = ภาพปก)</label><div id="fImgs"></div></div>' +
        '<div class="field span-3"><label>ไฟล์ผลงาน (.gsp, .pdf, วิดีโอ ฯลฯ)</label><div id="fFiles"></div><span class="hint" id="gspWarn"></span></div>' +
        '<div class="span-3"><label class="check"><input type="checkbox" id="fPub"' + (r.published ? ' checked' : '') + '> เผยแพร่บนหน้าสาธารณะ</label></div>' +
        '</form>',
      foot: '<span class="muted" style="font-size:12px;margin-right:auto">Ctrl+Enter = บันทึก</span><button class="btn" id="fCancel">ยกเลิก</button>' + (isNew ? '<button class="btn" id="fSaveNext">บันทึกและเพิ่มอันดับถัดไป</button>' : '') + '<button class="btn btn-primary" id="fSave">บันทึก</button>',
      onMount: function () {
        stuIn = MultiInput($('#fStu'), r.students, { ph: 'ชื่อ-สกุล นักเรียน', min: 2 });
        coIn = MultiInput($('#fCoach'), r.coaches, { ph: 'ชื่อ-สกุล ครูผู้ฝึกสอน', min: 2, list: 'dlCoaches' });
        imgUp = Uploader($('#fImgs'), r.images, { label: 'อัปโหลดรูปภาพ', folder: 'images', image: true, accept: 'image/*', hint: 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก · รูปใหญ่เกิน 1.5 MB จะถูกย่ออัตโนมัติ' });
        fileUp = Uploader($('#fFiles'), r.files, { onChange: function (l) { var w = $('#gspWarn'); if (w) w.innerHTML = l.some(function (f) { return U.isGsp(f.name); }) ? '<span style="color:var(--green)">✓ มีไฟล์ GSP แล้ว — ผู้ชมจะดาวน์โหลดไปเปิดในโปรแกรมได้</span>' : '<span style="color:#b07a00">ยังไม่มีไฟล์ .gsp — แนะนำให้แนบไฟล์ผลงานเพื่อให้ครูและนักเรียนนำไปฝึก</span>'; }, label: 'อัปโหลดไฟล์ผลงาน .gsp และเอกสารประกอบ', folder: 'files', kinds: FILE_KINDS_RES, accept: FILE_ACCEPT, hint: FILE_HINT });
        function lbl() {
          $('#fRankLbl').textContent = $('#fRank').value ? U.rankLabel($('#fRank').value) : '';
          var auto = U.medalAuto($('#fScore').value, DB.settings);
          $('#fMedalLbl').textContent = auto ? 'จากคะแนน: ' + (auto === 'เข้าร่วม' ? auto : 'เหรียญ' + auto) : '';
        }
        $('#fRank').oninput = lbl; $('#fScore').oninput = lbl; lbl();
        $('#fComp').onchange = function () { if (isNew) { $('#fRank').value = nextRank(this.value); lbl(); } };
        $('#fCancel').onclick = closeModal;
        function save(btn, again) {
          if (imgUp.pending() || fileUp.pending()) { U.toast('รอให้อัปโหลดไฟล์เสร็จก่อน', 'err'); return; }
          var data = {
            id: r.id || '', competitionId: $('#fComp').value, rank: Number($('#fRank').value), score: $('#fScore').value === '' ? '' : Number($('#fScore').value),
            medal: $('#fMedal').value, advance: $('#fAdv').checked, school: $('#fSchool').value.trim(),
            students: stuIn.get(), coaches: coIn.get(), title: $('#fTitle').value.trim(), description: $('#fDesc').value.trim(),
            images: imgUp.get(), files: fileUp.get(), published: $('#fPub').checked, createdAt: r.createdAt || ''
          };
          if (!data.rank || data.rank < 1) { U.toast('กรุณาระบุอันดับให้ถูกต้อง', 'err'); return; }
          if (!data.school) { U.toast('กรุณาระบุโรงเรียน', 'err'); return; }
          if (!data.students.length) { U.toast('กรุณาระบุชื่อนักเรียนอย่างน้อย 1 คน', 'err'); return; }
          var dup = DB.results.filter(function (x) { return x.id !== r.id && x.competitionId === data.competitionId && Number(x.rank) === data.rank; });
          var go2 = dup.length ? confirmBox('อันดับที่ ' + data.rank + ' มีอยู่แล้วในรายการนี้ (' + esc(dup[0].school) + ')<br>ต้องการบันทึกเป็นอันดับร่วมหรือไม่?', 'บันทึกต่อ') : Promise.resolve(true);
          go2.then(function (ok) {
            if (!ok) return;
            busy(btn, true);
            API.call('saveResult', data).then(function () {
              U.toast('บันทึกผลงานแล้ว', 'ok');
              return load();
            }).then(function () {
              closeModal();
              RF.comp = data.competitionId;
              if (VIEW === 'results') paintResultsSafe(); else route();
              if (again) resultForm(null, data.competitionId);
            }).catch(function (e) { busy(btn, false); handleErr(e); });
          });
        }
        $('#fSave').onclick = function () { save(this, false); };
        $('#rf').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save($('#fSave'), false); } });
        if ($('#fSaveNext')) $('#fSaveNext').onclick = function () { save(this, true); };
      }
    });
  }
  function paintResultsSafe() { if ($('#rComp')) { $('#rComp').value = RF.comp; paintResults(); } else route(); }

  /* ================= นำเข้าจาก Excel ================= */
  var SAMPLE = '1\tโรงเรียนบ้านตัวอย่าง\tเด็กชายสมหมาย ใจดี\tเด็กหญิงสมใจ รักเรียน\tนางสาวครูดี ตั้งใจ\t\t92.50\tดอกบัวบานด้วยการหมุน\n' +
    '2\tโรงเรียนบ้านทดลอง\tเด็กหญิงกนก ทองดี\tเด็กชายภูมิ ศรีสุข\tนายครูเก่ง ขยัน\t\t88.25\tลายผ้าขิด\n' +
    '3\tโรงเรียนบ้านสาธิต\tเด็กชายธนา มีสุข\tเด็กหญิงพิมพ์ แก้วดี\tนางครูใจ ดีงาม\tนายครูสอง ช่วยสอน\t81.00\tกังหันลม';
  var parsed = [];
  function viewImport() {
    $('#view').innerHTML = pageHead('นำเข้าจาก Excel / Google Sheets', 'คัดลอกตารางผลการแข่งขันจาก Excel แล้ววางที่นี่ ระบบจะแปลงเป็นรายการผลงานให้ทั้งหมด (เพิ่มรูปและไฟล์ภายหลังได้)') +
      '<div class="panel"><div class="grid-2"><div class="field"><label>นำเข้าไปที่รายการแข่งขัน *</label><select class="select" id="iComp">' + compOptions(RF.comp) + '</select></div>' +
      '<div class="field" style="justify-content:flex-end"><label class="check"><input type="checkbox" id="iPub" checked> เผยแพร่ทันทีหลังนำเข้า</label></div></div>' +
      '<p class="muted" style="font-size:13.5px;margin:14px 0 8px">ลำดับคอลัมน์: <span class="mono">อันดับ | โรงเรียน | นักเรียน 1 | นักเรียน 2 | ครูผู้ฝึกสอน 1 | ครูผู้ฝึกสอน 2 | คะแนน | ชื่อผลงาน</span> (แถวหัวตารางจะถูกข้ามอัตโนมัติ)</p>' +
      '<textarea class="textarea mono" id="iText" style="min-height:180px;font-size:13px" placeholder="วางข้อมูลจาก Excel ที่นี่ (Ctrl+V)"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" id="iSample">ใส่ข้อมูลตัวอย่าง</button><button class="btn btn-blue" id="iParse">ตรวจสอบข้อมูล</button></div></div>' +
      '<div id="iPreview" style="margin-top:18px"></div>';
    if (!DB.competitions.length) { $('#iPreview').innerHTML = '<div class="empty">ต้องเพิ่มรายการแข่งขันก่อนจึงจะนำเข้าได้</div>'; }
    $('#iSample').onclick = function () { $('#iText').value = SAMPLE; };
    $('#iParse').onclick = function () { parsed = parseTSV($('#iText').value); paintPreview(); };
  }
  function parseTSV(txt) {
    var rows = [];
    String(txt || '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var cells = line.indexOf('\t') > -1 ? line.split('\t') : line.split(',');
      cells = cells.map(function (x) { return x.trim(); });
      if (!rows.length && isNaN(Number(cells[0]))) return;
      var r = {
        rank: Number(cells[0]), school: cells[1] || '',
        students: [cells[2], cells[3]].filter(function (x) { return x; }),
        coaches: [cells[4], cells[5]].filter(function (x) { return x; }),
        score: cells[6] === undefined || cells[6] === '' ? '' : Number(cells[6]),
        title: cells[7] || '', medal: '', advance: false, description: ''
      };
      r._err = [];
      if (!r.rank || r.rank < 1) r._err.push('rank');
      if (!r.school) r._err.push('school');
      if (!r.students.length) r._err.push('students');
      if (r.score !== '' && isNaN(r.score)) r._err.push('score');
      rows.push(r);
    });
    return rows;
  }
  function paintPreview() {
    if (!parsed.length) { $('#iPreview').innerHTML = '<div class="empty">ไม่พบข้อมูลที่อ่านได้</div>'; return; }
    var bad = parsed.filter(function (r) { return r._err.length; }).length;
    function td(r, k, v) { return '<td' + (r._err.indexOf(k) > -1 ? ' class="bad"' : '') + '>' + v + '</td>'; }
    $('#iPreview').innerHTML = '<div class="panel" style="padding:0;overflow:hidden"><div class="tbl-wrap"><table class="tbl preview-tbl"><thead><tr><th>อันดับ</th><th>โรงเรียน</th><th>นักเรียน</th><th>ครูผู้ฝึกสอน</th><th>คะแนน</th><th>เหรียญ</th><th>ชื่อผลงาน</th></tr></thead><tbody>' +
      parsed.map(function (r) {
        return '<tr>' + td(r, 'rank', U.rankBadge(r.rank || '?')) + td(r, 'school', esc(r.school)) + td(r, 'students', r.students.map(esc).join('<br>')) +
          '<td>' + r.coaches.map(esc).join('<br>') + '</td>' + td(r, 'score', esc(r.score)) + '<td>' + U.medalTag(U.medalAuto(r.score, DB.settings)) + '</td><td>' + esc(r.title) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap">' +
      (bad ? '<span class="tag red">มี ' + bad + ' แถวที่ข้อมูลไม่ครบ (ช่องสีแดง) — แก้ไขแล้วตรวจสอบใหม่</span>' : '<span class="tag green">ข้อมูลถูกต้อง ' + parsed.length + ' แถว</span>') +
      '<button class="btn btn-primary" id="iGo"' + (bad ? ' disabled' : '') + '>นำเข้า ' + parsed.length + ' รายการ</button></div>';
    if ($('#iGo')) $('#iGo').onclick = function () {
      var btn = this, cid = $('#iComp').value;
      var rows = parsed.map(function (r) { var o = U.clone(r); delete o._err; return o; });
      busy(btn, true, 'กำลังนำเข้า...');
      API.call('bulkImport', { competitionId: cid, published: $('#iPub').checked, rows: rows }).then(function (d) {
        U.toast('นำเข้าแล้ว ' + d.count + ' รายการ', 'ok');
        parsed = [];
        RF.comp = cid;
        return load().then(function () { go('results'); });
      }).catch(function (e) { busy(btn, false); handleErr(e); });
    };
  }

  /* ================= รายงาน PDF / QR ================= */
  function viewReports() {
    var all = Report.ctx(DB.settings, DB.competitions, DB.results);
    var pub = Report.ctx(DB.settings, DB.competitions.filter(function (c) { return c.published; }), DB.results.filter(function (r) { return r.published; }));
    var schools = Report.schools(pub), years = uniqYears().sort().reverse();
    var home = Report.base(DB.settings);
    function card(icon, title, desc, ctl, btn) {
      return '<div class="panel glow"><h3 style="display:flex;gap:8px;align-items:center">' + ICON(icon) + title + '</h3><p class="muted" style="margin:-6px 0 12px;font-size:13.5px">' + desc + '</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' + ctl + btn + '</div></div>';
    }
    $('#view').innerHTML = pageHead('รายงาน PDF / QR Code', 'สร้างเอกสารขนาด A4 → กด "พิมพ์ / บันทึกเป็น PDF" แล้วเลือกปลายทางเป็น PDF',
      '<a class="btn" href="#site-config">' + ICON('gear') + 'ตั้งค่าผู้ลงนาม / ที่อยู่เว็บ</a>') +
      '<div class="grid-2">' +
      card('trophy', 'ประกาศผลการแข่งขัน', 'ตารางผลทุกอันดับ พร้อมเหรียญ ตัวแทน ผู้ลงนาม และ QR ไปหน้าผลงาน',
        '<select class="select" id="rpComp" style="flex:1;min-width:220px">' + years.map(function (y) { return opt('y:' + y, '▸ ทุกรายการของปี ' + y, ''); }).join('') + compOptions(RF.comp) + '</select>',
        '<button class="btn btn-primary" id="rpA">สร้างประกาศผล</button>') +
      card('flag', 'รายงานผลงานรายโรงเรียน', 'ผลงานทุกปีของโรงเรียน พร้อม QR Code ของโรงเรียนและของแต่ละผลงาน (เฉพาะที่เผยแพร่)',
        '<select class="select" id="rpSch" style="flex:1;min-width:220px">' + opt('*', '▸ ทุกโรงเรียน (โรงเรียนละหน้า)', '') + schools.map(function (o) { return opt(o.name, o.name + ' (' + o.n + ')', ''); }).join('') + '</select>',
        '<button class="btn btn-primary" id="rpS">สร้างรายงาน</button>') +
      card('grid', 'แผ่น QR Code รายโรงเรียน', 'หน้าละ 8 โรงเรียน มีเส้นประให้ตัดแจก โรงเรียนสแกนแล้วเห็นผลงานของตัวเองทันที',
        '<select class="select" id="rpQy" style="flex:1;min-width:180px">' + opt('', 'ทุกปีการศึกษา', '') + years.map(function (y) { return opt(y, 'เฉพาะโรงเรียนที่ได้รางวัลปี ' + y, ''); }).join('') + '</select>',
        '<button class="btn btn-primary" id="rpQ">สร้างแผ่น QR</button>') +
      card('globe', 'โปสเตอร์ QR หน้าเว็บ', 'โปสเตอร์ A4 ติดบอร์ดหรือฉายขึ้นจอ เชิญชมผลงานและดาวน์โหลดโจทย์', '<span class="mono muted" style="font-size:12px;align-self:center;flex:1;word-break:break-all">' + esc(home) + '</span>',
        '<button class="btn btn-primary" id="rpP">สร้างโปสเตอร์</button>') + '</div>' +
      '<div class="panel" style="margin-top:18px"><h3>ลิงก์และ QR รายโรงเรียน <span class="tag gray">' + schools.length + ' โรงเรียน</span></h3>' +
      '<p class="muted" style="margin:-6px 0 12px;font-size:13.5px">คัดลอกลิงก์ส่งให้โรงเรียนทาง LINE ได้ทันที</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>QR</th><th>โรงเรียน</th><th>ผลงาน</th><th>ชนะเลิศ</th><th>ทอง / เงิน / ทองแดง</th><th></th></tr></thead><tbody>' +
      schools.map(function (o, i) {
        return '<tr><td><div style="width:54px">' + Report.qrSvg(Report.schoolLink(DB.settings, o.name)) + '</div></td><td><b style="font-weight:600">' + esc(o.name) + '</b><br><span class="mono muted" style="font-size:11px">#s-' + Report.schoolCode(o.name) + '</span></td><td>' + o.n + '</td><td>' + o.w +
          '</td><td class="mono">' + o.g + ' / ' + o.s + ' / ' + o.b + '</td><td><div class="row-actions"><button class="btn btn-sm" data-cp="' + i + '">' + ICON('link') + 'คัดลอกลิงก์</button><button class="btn btn-sm" data-pr="' + i + '">' + ICON('file') + 'PDF</button></div></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    $('#rpA').onclick = function () {
      var v = $('#rpComp').value, ids = v.indexOf('y:') === 0 ? DB.competitions.filter(function (c) { return String(c.year) === v.slice(2); }).map(function (c) { return c.id; }) : [v];
      Report.open('ประกาศผลการแข่งขัน', Report.announce(all, ids));
    };
    $('#rpS').onclick = function () {
      var v = $('#rpSch').value;
      Report.open('รายงานผลงานรายโรงเรียน', Report.school(pub, v === '*' ? schools.map(function (o) { return o.name; }) : [v]));
    };
    $('#rpQ').onclick = function () { var y = $('#rpQy').value; Report.open('QR Code รายโรงเรียน', Report.qrSheet(pub, Report.schools(pub, y), y)); };
    $('#rpP').onclick = function () { Report.open('โปสเตอร์ QR', Report.poster(pub)); };
    $$('[data-cp]').forEach(function (b) {
      b.onclick = function () {
        var o = schools[Number(b.getAttribute('data-cp'))], link = Report.schoolLink(DB.settings, o.name);
        U.copy(o.name + ' — ผลงานการแข่งขัน GSP\n' + link).then(function () { U.toast('คัดลอกลิงก์ ' + o.name + ' แล้ว', 'ok'); }).catch(function () { U.toast(link); });
      };
    });
    $$('[data-pr]').forEach(function (b) {
      b.onclick = function () { var o = schools[Number(b.getAttribute('data-pr'))]; Report.open('รายงาน ' + o.name, Report.school(pub, [o.name])); };
    });
  }

  /* ================= ตั้งค่า ================= */
  function viewSettings() {
    var s = DB.settings;
    $('#view').innerHTML = pageHead('ตั้งค่าระบบ', 'ข้อความบนหน้าเผยแพร่ เกณฑ์เหรียญ และรหัสผ่าน') +
      '<div class="stat-grid"><div class="panel"><form id="sf" class="grid-2">' +
      '<div class="form-sec">หน้าเผยแพร่</div>' +
      '<div class="field span-2"><label>ชื่อระบบ</label><input class="input" id="sTitle" value="' + esc(s.siteTitle) + '"></div>' +
      '<div class="field span-2"><label>คำอธิบายใต้หัวเว็บ</label><input class="input" id="sSub" value="' + esc(s.siteSubtitle) + '"></div>' +
      '<div class="field span-2"><label>แถบประกาศ</label><input class="input" id="sAnn" value="' + esc(s.announcement) + '" placeholder="เว้นว่าง = ไม่แสดงแถบประกาศ"></div>' +
      '<div class="field span-2"><label>ข้อความท้ายเว็บ (Footer)</label><input class="input" id="sFoot" value="' + esc(s.footerText) + '"></div>' +
      '<div class="form-sec">เกณฑ์เหรียญรางวัล (คะแนนขั้นต่ำ)</div>' +
      '<div class="grid-3 span-2"><div class="field"><label>เหรียญทอง ≥</label><input class="input" type="number" id="sG" value="' + esc(s.goldMin) + '"></div>' +
      '<div class="field"><label>เหรียญเงิน ≥</label><input class="input" type="number" id="sS" value="' + esc(s.silverMin) + '"></div>' +
      '<div class="field"><label>เหรียญทองแดง ≥</label><input class="input" type="number" id="sB" value="' + esc(s.bronzeMin) + '"></div></div>' +
      '<div class="form-sec">ตัวเลือกในฟอร์ม</div>' +
      '<div class="field span-2"><label>ระดับชั้น (คั่นด้วย ,)</label><input class="input" id="sLv" value="' + esc(s.levels) + '"></div>' +
      '<div class="field span-2"><label>ระดับการแข่งขัน (คั่นด้วย ,)</label><input class="input" id="sSt" value="' + esc(s.stages) + '"></div>' +
      '<div class="form-sec">รายงาน PDF / QR Code</div>' +
      '<div class="field span-2"><label>ที่อยู่เว็บหน้าเผยแพร่ (ใช้สร้าง QR Code)</label><input class="input" id="sUrl" value="' + esc(s.publicUrl || '') + '" placeholder="เช่น https://gsp-showcase.vercel.app/"><span class="hint">เว้นว่าง = ใช้ที่อยู่ปัจจุบันอัตโนมัติ (' + esc(Report.base({})) + ')</span></div>' +
      '<div class="field span-2"><label>หน่วยงาน / คณะกรรมการที่ออกประกาศ</label><input class="input" id="sOrg" value="' + esc(s.reportOrg || '') + '" placeholder="เช่น คณะกรรมการตัดสินการแข่งขัน"></div>' +
      '<div class="field span-2"><label>ผู้ลงนามท้ายประกาศ (บรรทัดละ 1 คน: ชื่อ | ตำแหน่ง)</label><textarea class="textarea" id="sSign" placeholder="นายสมชาย ใจดี | ประธานกรรมการ">' + esc(s.signers || '') + '</textarea><span class="hint">เว้นชื่อว่างไว้ได้ เช่น " | กรรมการ" จะเป็นเส้นประให้เขียนชื่อเอง</span></div>' +
      '<div class="span-2"><button type="submit" class="btn btn-primary" id="sSave">บันทึกการตั้งค่า</button></div></form></div>' +
      '<div><div class="panel"><h3>เปลี่ยนรหัสผ่านกรรมการ</h3><form id="pf" style="display:flex;flex-direction:column;gap:12px">' +
      '<div class="field"><label>รหัสผ่านเดิม</label><input class="input" type="password" id="pOld" autocomplete="current-password"></div>' +
      '<div class="field"><label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</label><input class="input" type="password" id="pNew" autocomplete="new-password"></div>' +
      '<div class="field"><label>ยืนยันรหัสผ่านใหม่</label><input class="input" type="password" id="pNew2" autocomplete="new-password"></div>' +
      '<button class="btn" type="submit" id="pSave">เปลี่ยนรหัสผ่าน</button></form></div>' +
      '<div class="panel" style="margin-top:18px"><h3>การเชื่อมต่อ</h3><p style="margin:0 0 10px;font-size:14px">' +
      (API.isDemo ? '<span class="tag gold" style="background:var(--gold-soft);color:#7a5c06">โหมดสาธิต</span> ยังไม่ได้ตั้งค่า <span class="mono">API_URL</span> ใน <span class="mono">js/config.js</span>' :
        '<span class="tag green">เชื่อมต่อ Google Apps Script</span><br><span class="mono muted" style="font-size:12px;word-break:break-all">' + esc(CONFIG.API_URL) + '</span>') + '</p>' +
      (API.isDemo ? '<button class="btn btn-danger btn-sm" id="resetDemo">รีเซ็ตข้อมูลตัวอย่าง</button>' : '') + '</div></div></div>';
    $('#sf').onsubmit = function (e) {
      e.preventDefault();
      var g = Number($('#sG').value), si = Number($('#sS').value), b = Number($('#sB').value);
      if (!(g > si && si > b)) { U.toast('เกณฑ์ต้องเรียง ทอง > เงิน > ทองแดง', 'err'); return; }
      var data = {
        siteTitle: $('#sTitle').value.trim(), siteSubtitle: $('#sSub').value.trim(), announcement: $('#sAnn').value.trim(),
        footerText: $('#sFoot').value.trim(), goldMin: g, silverMin: si, bronzeMin: b,
        levels: $('#sLv').value.trim(), stages: $('#sSt').value.trim(),
        publicUrl: $('#sUrl').value.trim(), reportOrg: $('#sOrg').value.trim(), signers: $('#sSign').value.trim()
      };
      var btn = $('#sSave'); busy(btn, true);
      API.call('saveSettings', data).then(function () { DB.settings = data; U.toast('บันทึกการตั้งค่าแล้ว', 'ok'); })
        .catch(handleErr).then(function () { busy(btn, false); });
    };
    $('#pf').onsubmit = function (e) {
      e.preventDefault();
      var n = $('#pNew').value;
      if (n.length < 8) { U.toast('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร', 'err'); return; }
      if (n !== $('#pNew2').value) { U.toast('ยืนยันรหัสผ่านไม่ตรงกัน', 'err'); return; }
      var btn = $('#pSave'); busy(btn, true);
      API.call('changePassword', { oldPassword: $('#pOld').value, newPassword: n }).then(function () {
        U.toast('เปลี่ยนรหัสผ่านแล้ว', 'ok'); $('#pf').reset();
      }).catch(handleErr).then(function () { busy(btn, false); });
    };
    if ($('#resetDemo')) $('#resetDemo').onclick = function () {
      confirmBox('ล้างข้อมูลที่แก้ไขทั้งหมด และกลับไปใช้ข้อมูลตัวอย่างเริ่มต้น?', 'รีเซ็ต', true).then(function (ok) {
        if (!ok) return;
        API.resetDemo();
        reload().then(function () { U.toast('รีเซ็ตข้อมูลตัวอย่างแล้ว', 'ok'); });
      });
    };
  }

  init();
})();
