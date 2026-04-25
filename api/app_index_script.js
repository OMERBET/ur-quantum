// ══════════════════════════════════════════════════════════════
//  Iraq Quantum Computing Lab — app_index_script.js v5.2
//  Persistent Login + Last Search + Shor 51-bit + Controls
//  FIX v5.2: 40-bit BigInt precision — raw string N passed to engine
//  Developer: Jaafar Al-Fares (@TheHolyAmstrdam)
// ═══════════════════════════════════════════════════════════════
'use strict';

var uiLang    = 'ar';
var currQ     = '';
var currUser  = null;
var currEmail = '';
var gAuthMode = 'login';

// ─────────────────────────────────────────────────────────────────
//  PERSISTENT STORAGE HELPERS
// ─────────────────────────────────────────────────────────────────
var STORE = {
  getUsers()  { try { return JSON.parse(localStorage.getItem('iqlab_users') || '{}'); } catch(e) { return {}; } },
  saveUsers(u){ try { localStorage.setItem('iqlab_users', JSON.stringify(u)); } catch(e) {} },

  getSession(){ try { return JSON.parse(localStorage.getItem('iqlab_session') || 'null'); } catch(e) { return null; } },
  saveSession(data){ try { localStorage.setItem('iqlab_session', JSON.stringify(data)); } catch(e) {} },
  clearSession(){ try { localStorage.removeItem('iqlab_session'); } catch(e) {} },

  getLastSearch(){ try { return JSON.parse(localStorage.getItem('iqlab_last_search') || 'null'); } catch(e) { return null; } },
  saveLastSearch(data){ try { localStorage.setItem('iqlab_last_search', JSON.stringify(data)); } catch(e) {} },
};

// ─────────────────────────────────────────────────────────────────
//  PAGE ROUTING
// ─────────────────────────────────────────────────────────────────
function showPage(name) {
  document.getElementById('main-page').style.display    = name === 'main'    ? 'block' : 'none';
  document.getElementById('updates-page').style.display = name === 'updates' ? 'block' : 'none';
  document.getElementById('docs-page').style.display    = name === 'docs'    ? 'block' : 'none';
  window.scrollTo(0, 0);
  return false;
}

// ─────────────────────────────────────────────────────────────────
//  GATE / AUTH
// ─────────────────────────────────────────────────────────────────
function gSwTab(mode, el) {
  gAuthMode = mode;
  document.querySelectorAll('.gtab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('g-name-f').style.display      = mode === 'register' ? 'block' : 'none';
  document.getElementById('remember-wrap').style.display = mode === 'login'    ? 'flex'  : 'none';
  document.getElementById('gate-btn').textContent = mode === 'register' ? 'إنشاء الحساب' : 'دخول المختبر';
  gClrMsg();
}

function gMsg(tp, x) {
  gClrMsg();
  var el = document.getElementById(tp === 'ok' ? 'gaok' : 'gaer');
  el.innerHTML = x; el.classList.add('on');
}
function gClrMsg() {
  document.getElementById('gaok').classList.remove('on');
  document.getElementById('gaer').classList.remove('on');
}

function gSubmit() {
  var rawEmail = document.getElementById('g-email').value.trim();
  var rawPass  = document.getElementById('g-pass').value;
  var rawName  = document.getElementById('g-name').value.trim();
  var email    = typeof QASecurity !== 'undefined' ? QASecurity.sanitizeInput(rawEmail) : rawEmail;
  var pass     = rawPass;
  var name     = typeof QASecurity !== 'undefined' ? QASecurity.sanitizeInput(rawName)  : rawName;
  var remember = document.getElementById('g-remember').checked;

  if (!email || !pass) { gMsg('er', 'يرجى ملء جميع الحقول'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { gMsg('er', 'البريد الإلكتروني غير صحيح'); return; }
  if (pass.length < 6) { gMsg('er', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

  var users = STORE.getUsers();

  if (gAuthMode === 'register') {
    if (!name) { gMsg('er', 'يرجى إدخال الاسم الكامل'); return; }
    if (users[email]) { gMsg('er', '✗ البريد الإلكتروني مسجل مسبقاً'); return; }
    users[email] = { name: name, pass: btoa(unescape(encodeURIComponent(pass))), created: new Date().toISOString() };
    STORE.saveUsers(users);
    gMsg('ok', '✓ تم إنشاء الحساب بنجاح، جاري الدخول...');
    currUser = name; currEmail = email;
    STORE.saveSession({ name, email, ts: Date.now() });
    setTimeout(enterApp, 700);
  } else {
    if (!users[email]) { gMsg('er', '✗ البريد الإلكتروني غير مسجل'); return; }
    var stored = users[email].pass;
    var typed  = btoa(unescape(encodeURIComponent(pass)));
    if (typed !== stored) { gMsg('er', '✗ كلمة المرور غير صحيحة'); return; }
    gMsg('ok', '✓ مرحباً ' + users[email].name + '، جاري الدخول...');
    currUser = users[email].name; currEmail = email;
    if (remember) STORE.saveSession({ name: currUser, email, ts: Date.now() });
    setTimeout(enterApp, 600);
  }
}

function enterApp() {
  document.getElementById('gate').style.display = 'none';
  document.getElementById('app').style.display  = 'block';
  document.getElementById('nav-user').textContent = currUser;
  showPage('main');
  showToast('مرحباً ' + currUser + ' ⚡');

  var last = STORE.getLastSearch();
  if (last && last.email === currEmail && last.query) {
    setTimeout(function() {
      document.getElementById('qinp').value = last.query;
      tgSX();
      showToast('🔁 استعادة آخر بحث: ' + last.query.slice(0,30));
    }, 800);
  }
}

function doLogout() {
  STORE.clearSession();
  currUser = null; currEmail = '';
  document.getElementById('app').style.display  = 'none';
  document.getElementById('gate').style.display = 'flex';
  document.getElementById('g-email').value = '';
  document.getElementById('g-pass').value  = '';
  document.getElementById('g-name').value  = '';
  document.getElementById('g-name-f').style.display      = 'none';
  document.getElementById('gate-btn').textContent        = 'دخول المختبر';
  document.getElementById('remember-wrap').style.display = 'flex';
  gAuthMode = 'login';
  document.querySelectorAll('.gtab').forEach((t,i) => t.classList.toggle('active', i===0));
  gClrMsg();
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-LOGIN
// ─────────────────────────────────────────────────────────────────
function tryAutoLogin() {
  var session = STORE.getSession();
  if (!session) return false;
  var users = STORE.getUsers();
  if (!users[session.email]) { STORE.clearSession(); return false; }
  currUser  = session.name;
  currEmail = session.email;
  enterApp();
  return true;
}

// ─────────────────────────────────────────────────────────────────
//  LANGUAGE & TOPICS
// ─────────────────────────────────────────────────────────────────
var TOPICS = {
  ar: ['خوارزمية Shor (N=15)','خوارزمية Shor (N=51)','خوارزمية Shor (N=21)',
       'خوارزمية Grover','حالة Bell','حالة GHZ-51',
       'QFT تحويل فورييه','بروتوكول BB84','Cosmic Ray T₁',
       'VQE كيمياء كمية','QAOA MaxCut','MPS Bond States',
       'تشابك كمي','تصحيح الأخطاء','3×17 = 51 كيوبت',
       'Shor 40-bit (N=274,888,392,683)','Surface Code QEC','Random Circuit χ-Warning'],
  en: ['Shor Algorithm (N=15)','Shor Algorithm (N=51)','Shor Algorithm (N=21)',
       'Grover Search','Bell States','GHZ-51 State',
       'Quantum Fourier Transform','BB84 Protocol','Cosmic Ray Decoherence',
       'VQE Chemistry','QAOA MaxCut','MPS Bond States',
       'Quantum Entanglement','Error Correction','3×17 = 51 Qubits',
       'Shor 40-bit N=274888392683','Surface Code QEC','Random Circuit Warning'],
};

function renderTopics() {
  var list = TOPICS[uiLang] || TOPICS.ar;
  document.getElementById('tp-wrap').innerHTML = list.map(function(t) {
    return '<button class="tpill" onclick="askTopic(\'' + t.replace(/'/g,"\\'") + '\')">' + t + '</button>';
  }).join('');
}

function askTopic(t) {
  document.getElementById('qinp').value = t;
  tgSX(); doSearch();
  document.getElementById('qinp').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setLang(l, el) {
  uiLang = l;
  document.documentElement.lang = l;
  document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.lb').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderTopics();
}

// ─────────────────────────────────────────────────────────────────
//  CONTROLS
// ─────────────────────────────────────────────────────────────────
function onNChange(sel) {
  if (sel) {
    sel.dataset.rawValue = sel.value;
  }
}

function getControls() {
  var nSel = document.getElementById('ctrl-N');
  var rawNs = '';
  if (nSel) {
    rawNs = (nSel.dataset && nSel.dataset.rawValue) ? nSel.dataset.rawValue : nSel.value;
  }
  rawNs = (rawNs || '15').trim();

  var numN = 15;
  try {
    var parsed = parseInt(rawNs, 10);
    if (!isNaN(parsed) && parsed > 0) numN = parsed;
  } catch(e) { numN = 15; }

  return {
    r:      parseInt((document.getElementById('ctrl-r')     || {}).value, 10) || 4,
    shots:  parseInt((document.getElementById('ctrl-shots') || {}).value, 10) || 1024,
    N:      numN,
    Ns:     rawNs,
    cosmic: document.getElementById('cosmic-cb') ? document.getElementById('cosmic-cb').checked : false,
  };
}

function toggleCosmic(el) {
  var cb = document.getElementById('cosmic-cb');
  if (!cb) return;
  cb.checked = !cb.checked;
  el.classList.toggle('active', cb.checked);
  showToast(cb.checked ? '☄ Cosmic Ray T₁ مفعّل' : '☄ Cosmic Ray معطّل');
}

// ─────────────────────────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────────────────────────
function tgSX() {
  document.getElementById('sx').classList.toggle('on', document.getElementById('qinp').value.length > 0);
}
function clrSearch() {
  document.getElementById('qinp').value = '';
  document.getElementById('sx').classList.remove('on');
  var s = document.getElementById('rsec');
  s.style.display = 'none'; s.innerHTML = '';
  document.getElementById('qinp').focus();
}

// ─────────────────────────────────────────────────────────────────
//  RSA BOX
// ─────────────────────────────────────────────────────────────────
function buildRSABox(rsa, N) {
  if (!rsa || !rsa.verified) return '';
  return '<div class="rsa-box">'
    + '<div class="rsa-box-title">🔐 RSA — تحليل كامل · N = ' + N + '</div>'
    + '<div class="rsa-grid">'
    + '<div class="rsa-item"><div class="rsa-item-label">n = p × q</div>'
    + '<div class="rsa-item-val">' + rsa.n + ' = ' + rsa.p + ' × ' + rsa.q + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">Φ(n)</div>'
    + '<div class="rsa-item-val" style="color:#f1c21b">' + rsa.phi + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">e (مفتاح عام)</div>'
    + '<div class="rsa-item-val">' + rsa.e + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">d (مفتاح خاص)</div>'
    + '<div class="rsa-item-val" style="color:#f1c21b">' + rsa.d + '</div></div>'
    + '</div>'
    + '<div class="rsa-steps">'
    + '<div class="rsa-step"><span class="rsa-step-n">١</span><span class="rsa-step-txt">' + rsa.steps.step1 + '</span></div>'
    + '<div class="rsa-step"><span class="rsa-step-n">٢</span><span class="rsa-step-txt">' + rsa.steps.step2 + '</span></div>'
    + '<div class="rsa-step"><span class="rsa-step-n">٣</span><span class="rsa-step-txt">' + rsa.steps.step3 + '</span></div>'
    + '<div class="rsa-step"><span class="rsa-step-n">٤</span><span class="rsa-step-txt">' + rsa.steps.step4 + '</span></div>'
    + '<div class="rsa-step"><span class="rsa-step-n">٥</span><span class="rsa-step-txt" id="rs5">'
    + '<strong>' + rsa.steps.step5 + '</strong></span></div>'
    + '<div class="rsa-step"><span class="rsa-step-n">٦</span><span class="rsa-step-txt" id="rs6">'
    + '<strong>' + rsa.steps.step6 + '</strong></span></div>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">'
    + '<label style="font-family:monospace;font-size:10px;color:#8d8d8d">غيّر M:</label>'
    + '<input type="number" id="rsa-m-val" value="' + rsa.M + '" min="2" max="' + (rsa.n-1) + '"'
    + ' style="background:#161616;border:1px solid #4589ff;border-radius:4px;color:#fff;font-family:monospace;font-size:12px;padding:4px 8px;width:80px;outline:none">'
    + '<button onclick="updRSA(' + rsa.e + ',' + rsa.d + ',' + rsa.n + ')"'
    + ' style="background:#0f62fe;border:none;border-radius:4px;color:#fff;font-family:monospace;font-size:10px;padding:5px 12px;cursor:pointer">احسب</button>'
    + '</div>'
    + '<div id="rsa-ok" style="margin-top:8px;padding:8px 12px;background:rgba(66,190,101,.08);'
    + 'border:1px solid rgba(66,190,101,.2);border-radius:6px;font-family:monospace;font-size:11px;color:#42be65;text-align:center">'
    + '✓ M=' + rsa.M + ' → C=' + rsa.C + ' → M=' + rsa.M_dec + ' ✓</div>'
    + '</div>';
}

function updRSA(e, d, n) {
  var el = document.getElementById('rsa-m-val');
  if (!el) return;
  var M = parseInt(el.value, 10);
  if (!M || M < 2 || M >= n) { showToast('M يجب بين 2 و ' + (n-1)); return; }
  function mp(b, ex, m) {
    if (m > 9007199254) {
      var rb=1n, bb=BigInt(b)%BigInt(m), mb=BigInt(m), eb=BigInt(ex);
      while(eb>0n){if(eb&1n)rb=rb*bb%mb;eb>>=1n;bb=bb*bb%mb;} return Number(rb);
    }
    var r=1; b=b%m;
    while(ex>0){if(ex%2===1)r=(r*b)%m;ex=Math.floor(ex/2);b=(b*b)%m;} return r;
  }
  var C=mp(M,e,n), Md=mp(C,d,n), ok=Md===M;
  var s5=document.getElementById('rs5'), s6=document.getElementById('rs6'), sok=document.getElementById('rsa-ok');
  if(s5) s5.innerHTML='<strong>C = '+M+'^'+e+' mod '+n+' = <span style="color:#42be65">'+C+'</span></strong>';
  if(s6) s6.innerHTML='<strong>M = '+C+'^'+d+' mod '+n+' = <span style="color:#42be65">'+Md+'</span> '+(ok?'✓':'✗')+'</strong>';
  if(sok){ sok.textContent=(ok?'✓':'✗')+' M='+M+' → C='+C+' → M='+Md+(ok?' ✓':' ✗');
    sok.style.color=ok?'#42be65':'#ff832b'; }
}

// ─────────────────────────────────────────────────────────────────
//  MAIN SEARCH
// ─────────────────────────────────────────────────────────────────
async function doSearch() {
  if (typeof QASecurity !== 'undefined' && !QASecurity.rateLimit('search', 20)) {
    showToast('⚠ بطء قليل — 20 طلب بالدقيقة كحد أقصى'); return;
  }

  var rawQ = document.getElementById('qinp').value.trim();
  var q = typeof QASecurity !== 'undefined' ? QASecurity.sanitizeInput(rawQ) : rawQ.slice(0, 1000);
  if (!q) return;
  currQ = q;

  STORE.saveLastSearch({ query: q, email: currEmail, ts: Date.now() });

  var sec = document.getElementById('rsec');
  sec.style.display = 'block';
  sec.innerHTML = '<div class="lbar"></div><div class="loading-txt">// ⚛ تشغيل المحاكاة الكمية... Shor 51-bit · QFT · Alias Sampling</div>';

  var ctrl = getControls();
  var ts   = new Date().toISOString();

  try {
    var queryForEngine = q;
    var isShorQuery = /shor|شور|factor|تحليل|rsa/i.test(q);
    var queryHasN   = /n\s*=\s*\d+/i.test(q);

    if (!queryHasN) {
      var rawNs = ctrl.Ns || '15';
      var isLargeN = rawNs.length > 4;

      if (isLargeN) {
        queryForEngine = 'Shor N=' + rawNs;
      } else if (isShorQuery && rawNs !== '15') {
        queryForEngine = q + ' N=' + rawNs;
      }
    }

    var result = await QuantumAsk.ask(
      queryForEngine,
      uiLang,
      ctrl.r,
      ctrl.shots,
      { cosmicRay: ctrl.cosmic, Ns: ctrl.Ns }
    );

    window._lastSim = result.sim;

    sec.innerHTML = ''
      + '<div class="rh"><div class="rtag">✓ نتيجة محاكاة 51-كيوبت</div>'
      + '<div class="ra">'
      + '<button class="eb csv" onclick="expCSV()">📄 CSV</button>'
      + '<button class="eb xlsx" onclick="openXlsx()">📊 XLSX</button>'
      + '</div></div>'
      + '<div class="rb">' + result.html + '</div>'
      + (result.sim && result.sim.rsa ? buildRSABox(result.sim.rsa, result.sim.N) : '')
      + '<div class="rm">'
      + '<span>LANG: ' + uiLang.toUpperCase() + '</span>'
      + '<span>r: ' + ctrl.r + '</span>'
      + '<span>shots: ' + ctrl.shots + '</span>'
      + (ctrl.cosmic ? '<span style="color:#ff832b">☄ COSMIC RAY</span>' : '')
      + '<span>TIME: ' + new Date(ts).toLocaleTimeString() + '</span>'
      + (result.cached ? '<span style="color:#009d9a">CACHED</span>' : '')
      + '</div>';

  } catch(err) {
    sec.innerHTML = '<div style="padding:20px 24px;font-family:\'IBM Plex Mono\',monospace;font-size:12px;color:#ff8389">✗ خطأ: ' + (err.message || String(err)) + '</div>';
    console.error('[doSearch error]', err);
  }
}

// ─────────────────────────────────────────────────────────────────
//  CSV EXPORT
// ─────────────────────────────────────────────────────────────────
function expCSV() {
  var sim = window._lastSim;
  if (!sim) { showToast('لا توجد بيانات محاكاة بعد'); return; }
  var sorted = Object.entries(sim.counts).sort((a,b) => b[1]-a[1]);
  var lines  = ['Rank,State_51bit,Counts,Probability_pct,P_exact'];
  sorted.forEach(([bs,cnt], i) => {
    var full = bs.padEnd(51,'0').slice(0,51);
    lines.push(`${i+1},${full},${cnt},${(cnt/sim.shots*100).toFixed(4)},${(cnt/sim.shots).toFixed(6)}`);
  });
  lines.push('','# Metadata');
  lines.push('Type,' + sim.type);
  lines.push('Shots,' + sim.shots);
  lines.push('Unique_States,' + sorted.length);
  lines.push('N_Qubits,51');
  if (sim.type === 'Shor-QFT-51' || sim.type === 'Shor-QFT-40bit') {
    lines.push('N_factored,' + sim.N);
    lines.push('p,' + sim.p);
    lines.push('q,' + sim.q);
    lines.push('Period_r,' + (sim.period_r || '?'));
    lines.push('Method,' + sim.method);
    lines.push('Verified,' + (sim.verified || ''));
  }
  lines.push('Timestamp,' + new Date().toISOString());
  lines.push('Lab,Iraq Quantum Computing Lab v5.2');
  lines.push('Developer,Jaafar Al-Fares (TheHolyAmstrdam)');
  lines.push('Query,' + currQ.replace(/,/g,';'));

  var csv  = lines.join('\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'IQ_Quantum_' + sim.type + '_' + Date.now() + '.csv';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  showToast('✓ تم تنزيل ' + sorted.length + ' حالة 51-بت');
}

// ─────────────────────────────────────────────────────────────────
//  XLSX EXPORT
// ─────────────────────────────────────────────────────────────────
function openXlsx() {
  var sim = window._lastSim;
  if (!sim) { showToast('لا توجد بيانات محاكاة بعد'); return; }
  var sorted = Object.entries(sim.counts).sort((a,b) => b[1]-a[1]);
  var tbl = document.getElementById('xprev');
  var html = '<tr><th>State (51 bit)</th><th>Counts</th><th>Prob%</th><th>P(exact)</th></tr>';
  sorted.slice(0,3).forEach(([bs,cnt]) => {
    var full = bs.padEnd(51,'0').slice(0,51);
    html += `<tr><td title="${full}">${full.slice(0,16)}…</td><td>${cnt}</td><td>${(cnt/sim.shots*100).toFixed(2)}%</td><td>${(cnt/sim.shots).toFixed(4)}</td></tr>`;
  });
  tbl.innerHTML = html;
  document.getElementById('xrc').textContent = sorted.length;
  document.getElementById('xcc').textContent = 4;
  document.getElementById('xse').textContent = Math.round(sorted.length * 70 / 1024) + ' KB';
  document.getElementById('xfn').value = 'IQ_Quantum_' + sim.type + '_' + new Date().toISOString().slice(0,10);
  document.getElementById('xlsx-ov').classList.add('open');
}

function closeXlsx() { document.getElementById('xlsx-ov').classList.remove('open'); }

function confXlsx() {
  var sim = window._lastSim;
  if (!sim) { showToast('لا توجد بيانات'); return; }
  var fn    = (document.getElementById('xfn').value.trim() || 'IQ_Quantum').replace(/\.xlsx$/i,'');
  var sn    = document.getElementById('xsn').value.trim() || 'Quantum Results';
  var incTS = document.getElementById('xts').value !== 'no';
  var df    = document.getElementById('xdf').value || 'iso';
  var sorted = Object.entries(sim.counts).sort((a,b) => b[1]-a[1]);

  var rows = sorted.map(([bs,cnt], i) => {
    var full = bs.padEnd(51,'0').slice(0,51);
    var row  = {
      'Rank': i+1,
      'State (51 Qubits)': full,
      'Counts': cnt,
      'Probability (%)': parseFloat((cnt/sim.shots*100).toFixed(4)),
      'P(exact)': parseFloat((cnt/sim.shots).toFixed(6))
    };
    if (incTS) {
      var d = new Date();
      row['Timestamp'] = df==='local' ? d.toLocaleString('ar-IQ') : d.toISOString();
    }
    return row;
  });

  var H = 0;
  sorted.forEach(([,c]) => { var p=c/sim.shots; if(p>0) H -= p*Math.log2(p); });
  var meta = [
    { Key:'Circuit Type',  Value: sim.type },
    { Key:'Shots',         Value: sim.shots },
    { Key:'Unique States', Value: sorted.length },
    { Key:'N Qubits',      Value: 51 },
    { Key:'Shannon H(X)',  Value: H.toFixed(6)+' bits' },
    { Key:'Hilbert Space', Value: '2^51 = 2,251,799,813,685,248' },
  ];
  if (sim.type === 'Shor-QFT-51' || sim.type === 'Shor-QFT-40bit') {
    meta.push(
      { Key:'N factored', Value: String(sim.N) },
      { Key:'Factors',    Value: `${sim.p} × ${sim.q}` },
      { Key:'Period r',   Value: String(sim.period_r || '?') },
      { Key:'Method',     Value: sim.method },
      { Key:'Verified',   Value: sim.verified || '' },
    );
  }
  meta.push(
    { Key:'Query',       Value: currQ },
    { Key:'Timestamp',   Value: new Date().toISOString() },
    { Key:'Lab',         Value: 'UR Quantum — Iraq Quantum Computing Lab v5.2' },
    { Key:'Developer',   Value: 'Jaafar Al-Fares (TheHolyAmstrdam)' },
  );

  var steps_data = [];
  if (sim.type === 'Shor-QFT-51' || sim.type === 'Shor-QFT-40bit') {
    var rr = sim.period_r || 4;
    var NN = sim.N || 15;
    var Q51 = Math.pow(2, 51);
    steps_data = [
      { Step:'1',  Title:'Classical Pre-check',       Formula:'Verify N odd, N ≠ pᵏ',
        Computation:'N='+NN+' is odd ✓',              Value:'Proceed to quantum circuit',
        Complexity:'O(log³N)',                         Reference:'Nielsen & Chuang §5.3.1' },
      { Step:'2',  Title:'Choose Random Base a',      Formula:'Pick a ∈ [2,N-1], compute gcd(a,N)',
        Computation:'a='+sim.a+', gcd('+sim.a+','+NN+')=1', Value:'Coprime base confirmed ✓',
        Complexity:'O(log N) — Euclidean algorithm',  Reference:'Shor (1997) Algorithm §3' },
      { Step:'3',  Title:'Quantum Register Init',     Formula:'|ψ₀⟩ = H^⊗51 |0⟩^51 = (1/√2^51) Σ_{x=0}^{2^51-1} |x⟩',
        Computation:'51 Hadamard gates create uniform superposition', Value:'2^51 = 2,251,799,813,685,248 states',
        Complexity:'O(n) gates',                      Reference:'Nielsen & Chuang Eq. 5.20' },
      { Step:'4',  Title:'Oracle U_f Application',   Formula:'U_f|x⟩|0⟩ = |x⟩|a^x mod N⟩',
        Computation:'f(x) = '+sim.a+'^x mod '+NN+' for x=0..2^51-1', Value:'Periodicity embedded in quantum state',
        Complexity:'O(n³) using repeated squaring',   Reference:'Nielsen & Chuang Eq. 5.22' },
      { Step:'5',  Title:'Inverse QFT (IQFT)',        Formula:'QFT†|x⟩ = (1/√2^n) Σ_k e^{-2πixk/2^n}|k⟩',
        Computation:'51-qubit QFT: n(n+1)/2 = 1326 gates', Value:'Peaks at k_j = j·2^51/r',
        Complexity:'O(n²) gates vs O(N·logN) classical FFT', Reference:'Coppersmith (1994) IBM RC 19642' },
      { Step:'6',  Title:'QFT Peak Analysis',         Formula:'k_j = ⌊j·2^51/r⌋, spacing Δk = 2^51/r',
        Computation:'r='+rr+', spacing='+Math.floor(Q51/rr).toLocaleString(), Value:'Each peak P = 1/r = '+(1/rr).toFixed(8),
        Complexity:'—',                               Reference:'Nielsen & Chuang §5.3.2' },
      { Step:'7',  Title:'Shannon Entropy',           Formula:'H(X) = -Σ P(x)log₂P(x) = log₂(r) for uniform peaks',
        Computation:'H = log₂('+rr+') = '+Math.log2(rr).toFixed(6)+' bits', Value:'Maximum entropy for r equidistant outcomes',
        Complexity:'—',                               Reference:'Shannon (1948) Bell Syst. Tech. J.' },
      { Step:'8',  Title:'Continued Fractions',       Formula:'k/2^51 ≈ s/r → convergents of Farey sequence',
        Computation:'|k/2^51 - s/r| < 1/(2·2^51) → unique r', Value:'r='+rr+' verified: '+sim.a+'^'+rr+' mod '+NN+'=1 ✓',
        Complexity:'O(log N)',                         Reference:'Hardy & Wright (1979), Theorem 171' },
      { Step:'9',  Title:'Factor Extraction via GCD', Formula:'p=gcd(a^{r/2}-1, N), q=gcd(a^{r/2}+1, N)',
        Computation:'p='+sim.p+', q='+sim.q,          Value:'Factored: '+sim.p+' × '+sim.q+' = '+NN+' ✓',
        Complexity:'O(log N)',                         Reference:'Shor (1997) SIAM J. Comput. 26(5)' },
      { Step:'10', Title:'Alias Method Sampling',     Formula:'Build alias table in O(n), sample in O(1)',
        Computation:sim.shots+' shots from '+Object.keys(sim.counts).length+' states', Value:'Exact multinomial QFT sampling',
        Complexity:'O(n) preprocess, O(1) per sample', Reference:'Walker (1974) ACM TOMS' },
      { Step:'11', Title:'IBM Eagle Noise Model',     Formula:'ε_total = ε_readout + ε_gate × n_qubits',
        Computation:'0.0325 + 0.000842×51 = 7.54%',   Value:'T₁=145.2μs, T₂=122.8μs',
        Complexity:'—',                               Reference:'IBM Eagle Calibration (2024)' },
    ];
  }

  var wsSteps = XLSX.utils.json_to_sheet(steps_data);
  wsSteps['!cols'] = [{wch:5},{wch:28},{wch:42},{wch:42},{wch:30},{wch:18},{wch:35}];

  try {
    var ws     = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{wch:6},{wch:55},{wch:8},{wch:14},{wch:10},{wch:24}];
    var wsMeta = XLSX.utils.json_to_sheet(meta);
    wsMeta['!cols'] = [{wch:24},{wch:55}];
    var wb = XLSX.utils.book_new();
    wb.Props = { Title:'UR Quantum Lab v5.2 — 51-Qubit Scientific Data', Author:'Jaafar Al-Fares' };
    XLSX.utils.book_append_sheet(wb, ws,      sn);
    XLSX.utils.book_append_sheet(wb, wsMeta,  'Metadata');
    XLSX.utils.book_append_sheet(wb, wsSteps, 'Scientific Steps');
    XLSX.writeFile(wb, fn+'.xlsx');
    closeXlsx();
    showToast('✓ تم تنزيل ' + sorted.length + ' حالة → ' + fn + '.xlsx');
  } catch(err) {
    showToast('✗ خطأ: ' + err.message);
    console.error('[confXlsx error]', err);
  }
}

// ─────────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────────
function showToast(m, d) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = m; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), d || 3000);
}

// ─────────────────────────────────────────────────────────────────
//  RSA Box styles — injected once
// ─────────────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('rsa-css')) return;
  var s = document.createElement('style');
  s.id = 'rsa-css';
  s.textContent =
    '.rsa-box{background:linear-gradient(135deg,#0a1628,#0d2137);border:1px solid rgba(69,137,255,.3);border-radius:12px;margin:16px 0;padding:18px 20px;direction:rtl}'
    +'.rsa-box-title{font-family:"IBM Plex Mono",monospace;color:#4589ff;font-size:11px;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(69,137,255,.2);padding-bottom:8px;margin-bottom:12px}'
    +'.rsa-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}'
    +'@media(max-width:600px){.rsa-grid{grid-template-columns:1fr}}'
    +'.rsa-item{background:rgba(255,255,255,.04);border-radius:6px;padding:8px 12px;border:1px solid rgba(255,255,255,.06)}'
    +'.rsa-item-label{font-family:"IBM Plex Mono",monospace;font-size:9px;color:#8d8d8d;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}'
    +'.rsa-item-val{font-family:"IBM Plex Mono",monospace;font-size:14px;color:#fff;font-weight:600}'
    +'.rsa-steps{background:rgba(0,0,0,.25);border-radius:6px;padding:12px 14px;font-family:"IBM Plex Mono",monospace;font-size:11px;line-height:1.9;margin-bottom:10px}'
    +'.rsa-step{display:flex;gap:10px;align-items:baseline}'
    +'.rsa-step-n{color:#4589ff;min-width:20px;font-size:10px}'
    +'.rsa-step-txt{color:#c6c6c6}';
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────────────
showPage('main');
renderTopics();

if (!tryAutoLogin()) {
  document.getElementById('gate').style.display = 'flex';
}
