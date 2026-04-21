// ══════════════════════════════════════════════════════════════
//  Iraq Quantum Computing Lab — app_index_script.js v6.0
//  Universal Storage — Works on ALL devices:
//  iOS Safari · Android Chrome · iPad · Desktop · Private Mode
//  FIX v6.0: localStorage → sessionStorage → memory fallback
//  FIX v6.0: 40-bit BigInt precision preserved
//  Developer: Jaafar Al-Fares (@TheHolyAmstrdam)
// ══════════════════════════════════════════════════════════════
'use strict';

var uiLang    = 'ar';
var currQ     = '';
var currUser  = null;
var currEmail = '';
var gAuthMode = 'login';

// ─────────────────────────────────────────────────────────────────
//  UNIVERSAL STORAGE ENGINE v6.0
//  Priority: localStorage → sessionStorage → memory
//  Handles: iOS Private Mode, Safari ITP, Android WebView,
//           Samsung Browser, UC Browser, old iOS versions
// ─────────────────────────────────────────────────────────────────
var STORE = (function() {
  var _ls = false, _ss = false;

  // Test localStorage
  try {
    localStorage.setItem('__iq__', '1');
    localStorage.removeItem('__iq__');
    _ls = true;
  } catch(e) { _ls = false; }

  // Test sessionStorage
  try {
    sessionStorage.setItem('__iq__', '1');
    sessionStorage.removeItem('__iq__');
    _ss = true;
  } catch(e) { _ss = false; }

  // In-memory fallback — works everywhere, no persistence after tab close
  var _mem = {};

  function _get(key) {
    try {
      if (_ls) return localStorage.getItem(key);
      if (_ss) return sessionStorage.getItem(key);
      return (_mem[key] !== undefined) ? _mem[key] : null;
    } catch(e) { return (_mem[key] !== undefined) ? _mem[key] : null; }
  }

  function _set(key, val) {
    try {
      if (_ls) { localStorage.setItem(key, val); return; }
      if (_ss) { sessionStorage.setItem(key, val); return; }
    } catch(e) {}
    _mem[key] = val;
  }

  function _del(key) {
    try {
      if (_ls) { localStorage.removeItem(key); return; }
      if (_ss) { sessionStorage.removeItem(key); return; }
    } catch(e) {}
    delete _mem[key];
  }

  function _parse(val, fallback) {
    if (val === null || val === undefined) return fallback;
    try { return JSON.parse(val) || fallback; } catch(e) { return fallback; }
  }

  return {
    mode:       _ls ? 'localStorage' : _ss ? 'sessionStorage' : 'memory',
    persistent: _ls,

    getUsers()        { return _parse(_get('iqlab_users'),   {}); },
    saveUsers(u)      { _set('iqlab_users',   JSON.stringify(u)); },
    getSession()      { return _parse(_get('iqlab_session'), null); },
    saveSession(d)    { _set('iqlab_session', JSON.stringify(d)); },
    clearSession()    { _del('iqlab_session'); },
    getLastSearch()   { return _parse(_get('iqlab_last'),    null); },
    saveLastSearch(d) { _set('iqlab_last',    JSON.stringify(d)); },
  };
})();

// ─────────────────────────────────────────────────────────────────
//  PAGE ROUTING
// ─────────────────────────────────────────────────────────────────
function showPage(name) {
  ['main','updates','docs'].forEach(function(p) {
    var el = document.getElementById(p + '-page');
    if (el) el.style.display = (p === name) ? 'block' : 'none';
  });
  window.scrollTo(0, 0);
  return false;
}

// ─────────────────────────────────────────────────────────────────
//  GATE / AUTH
// ─────────────────────────────────────────────────────────────────
function gSwTab(mode, el) {
  gAuthMode = mode;
  document.querySelectorAll('.gtab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  var nf = document.getElementById('g-name-f');
  var rw = document.getElementById('remember-wrap');
  var gb = document.getElementById('gate-btn');
  if (nf) nf.style.display = mode === 'register' ? 'block' : 'none';
  if (rw) rw.style.display = mode === 'login'    ? 'flex'  : 'none';
  if (gb) gb.textContent   = mode === 'register' ? 'إنشاء الحساب' : 'دخول المختبر';
  gClrMsg();
}

function gMsg(tp, x) {
  gClrMsg();
  var el = document.getElementById(tp === 'ok' ? 'gaok' : 'gaer');
  if (el) { el.innerHTML = x; el.classList.add('on'); }
}

function gClrMsg() {
  var ok = document.getElementById('gaok');
  var er = document.getElementById('gaer');
  if (ok) ok.classList.remove('on');
  if (er) er.classList.remove('on');
}

function gSubmit() {
  var emailEl = document.getElementById('g-email');
  var passEl  = document.getElementById('g-pass');
  var nameEl  = document.getElementById('g-name');
  var remEl   = document.getElementById('g-remember');

  var rawEmail = emailEl ? emailEl.value.trim() : '';
  var rawPass  = passEl  ? passEl.value         : '';
  var rawName  = nameEl  ? nameEl.value.trim()  : '';
  var remember = remEl   ? remEl.checked        : false;

  var san = (typeof QASecurity !== 'undefined')
    ? function(s) { return QASecurity.sanitizeInput(s); }
    : function(s) { return s; };

  var email = san(rawEmail);
  var pass  = rawPass;
  var name  = san(rawName);

  if (!email || !pass) { gMsg('er', 'يرجى ملء جميع الحقول'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { gMsg('er', 'البريد الإلكتروني غير صحيح'); return; }
  if (pass.length < 6) { gMsg('er', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }

  var users = STORE.getUsers();

  function hashPass(p) {
    try { return btoa(unescape(encodeURIComponent(p))); } catch(e) { try { return btoa(p); } catch(e2) { return p; } }
  }

  if (gAuthMode === 'register') {
    if (!name) { gMsg('er', 'يرجى إدخال الاسم الكامل'); return; }
    if (users[email]) { gMsg('er', '✗ البريد الإلكتروني مسجل مسبقاً'); return; }
    users[email] = { name: name, pass: hashPass(pass), created: new Date().toISOString() };
    STORE.saveUsers(users);
    gMsg('ok', '✓ تم إنشاء الحساب بنجاح، جاري الدخول...');
    currUser  = name;
    currEmail = email;
    STORE.saveSession({ name: name, email: email, ts: Date.now() });
    setTimeout(enterApp, 700);

  } else {
    if (!users[email]) { gMsg('er', '✗ البريد الإلكتروني غير مسجل — أنشئ حساباً أولاً'); return; }
    if (hashPass(pass) !== users[email].pass) { gMsg('er', '✗ كلمة المرور غير صحيحة'); return; }
    gMsg('ok', '✓ مرحباً ' + users[email].name + '، جاري الدخول...');
    currUser  = users[email].name;
    currEmail = email;
    if (remember || !STORE.persistent) {
      STORE.saveSession({ name: currUser, email: email, ts: Date.now() });
    }
    setTimeout(enterApp, 600);
  }
}

function enterApp() {
  var gate = document.getElementById('gate');
  var app  = document.getElementById('app');
  var nu   = document.getElementById('nav-user');
  if (gate) gate.style.display = 'none';
  if (app)  app.style.display  = 'block';
  if (nu)   nu.textContent     = currUser || '';
  showPage('main');

  if (!STORE.persistent) {
    showToast('⚠ وضع مؤقت — سجّل الدخول لتعلم الجلسة', 4000);
  } else {
    showToast('مرحباً ' + currUser + ' ⚡');
  }

  var last = STORE.getLastSearch();
  if (last && last.email === currEmail && last.query) {
    setTimeout(function() {
      var qinp = document.getElementById('qinp');
      if (qinp) { qinp.value = last.query; tgSX(); }
      showToast('🔁 استعادة آخر بحث: ' + last.query.slice(0, 30));
    }, 900);
  }
}

function doLogout() {
  STORE.clearSession();
  currUser = null; currEmail = '';
  var app  = document.getElementById('app');
  var gate = document.getElementById('gate');
  if (app)  app.style.display  = 'none';
  if (gate) gate.style.display = 'flex';
  ['g-email','g-pass','g-name'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  var nf=document.getElementById('g-name-f'), gb=document.getElementById('gate-btn'), rw=document.getElementById('remember-wrap');
  if (nf) nf.style.display = 'none';
  if (gb) gb.textContent   = 'دخول المختبر';
  if (rw) rw.style.display = 'flex';
  gAuthMode = 'login';
  document.querySelectorAll('.gtab').forEach(function(t,i) { t.classList.toggle('active', i===0); });
  gClrMsg();
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-LOGIN
// ─────────────────────────────────────────────────────────────────
function tryAutoLogin() {
  var session = STORE.getSession();
  if (!session || !session.email) return false;
  var users = STORE.getUsers();
  if (!users[session.email]) { STORE.clearSession(); return false; }
  currUser  = session.name || users[session.email].name;
  currEmail = session.email;
  enterApp();
  return true;
}

// ─────────────────────────────────────────────────────────────────
//  LANGUAGE & TOPICS
// ─────────────────────────────────────────────────────────────────
var TOPICS = {
  ar: [
    'خوارزمية Shor (N=15)', 'خوارزمية Shor (N=51)', 'خوارزمية Shor (N=21)',
    'Shor 40-bit (N=274,888,392,683)', 'كسر RSA · Shor', 'تشفير نص · RSA',
    'خوارزمية Grover', 'حالة Bell', 'حالة GHZ-51', 'QFT تحويل فورييه',
    'بروتوكول BB84', 'Cosmic Ray T₁', 'VQE كيمياء كمية',
    'QAOA MaxCut', 'MPS Bond States', 'Surface Code QEC',
  ],
  en: [
    'Shor Algorithm (N=15)', 'Shor Algorithm (N=51)', 'Shor Algorithm (N=21)',
    'Shor 40-bit N=274888392683', 'Break RSA · Shor', 'Encrypt text · RSA',
    'Grover Search', 'Bell States', 'GHZ-51 State', 'Quantum Fourier Transform',
    'BB84 Protocol', 'Cosmic Ray Decoherence', 'VQE Chemistry',
    'QAOA MaxCut', 'MPS Bond States', 'Surface Code QEC',
  ],
};

function renderTopics() {
  var list = TOPICS[uiLang] || TOPICS.ar;
  var wrap = document.getElementById('tp-wrap');
  if (!wrap) return;
  wrap.innerHTML = list.map(function(t) {
    return '<button class="tpill" onclick="askTopic(\'' + t.replace(/\\/g,'\\\\').replace(/'/g,"\\'") + '\')">' + t + '</button>';
  }).join('');
}

function askTopic(t) {
  var qinp = document.getElementById('qinp');
  if (!qinp) return;
  qinp.value = t; tgSX(); doSearch();
  qinp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setLang(l, el) {
  uiLang = l;
  document.documentElement.lang = l;
  document.documentElement.dir  = (l === 'ar') ? 'rtl' : 'ltr';
  document.querySelectorAll('.lb').forEach(function(b) { b.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderTopics();
}

// ─────────────────────────────────────────────────────────────────
//  CONTROLS  (v6.0 — raw string N for 40-bit precision)
// ─────────────────────────────────────────────────────────────────
function onNChange(sel) {
  if (sel) sel.dataset.rawValue = sel.value;
}

function getControls() {
  var nSel    = document.getElementById('ctrl-N');
  var rSel    = document.getElementById('ctrl-r');
  var shotSel = document.getElementById('ctrl-shots');
  var cosmEl  = document.getElementById('cosmic-cb');

  var rawNs = '15';
  if (nSel) rawNs = (nSel.dataset && nSel.dataset.rawValue) ? nSel.dataset.rawValue : (nSel.value || '15');
  rawNs = rawNs.trim() || '15';

  var numN = 15;
  try { var p=parseInt(rawNs,10); if (!isNaN(p) && p>0) numN=p; } catch(e) {}

  return {
    r:      parseInt(rSel    ? rSel.value    : '4',    10) || 4,
    shots:  parseInt(shotSel ? shotSel.value : '1024', 10) || 1024,
    N:      numN,
    Ns:     rawNs,
    cosmic: cosmEl ? cosmEl.checked : false,
  };
}

function toggleCosmic(el) {
  var cb = document.getElementById('cosmic-cb');
  if (!cb) return;
  cb.checked = !cb.checked;
  if (el) el.classList.toggle('active', cb.checked);
  showToast(cb.checked ? '☄ Cosmic Ray T₁ مفعّل' : '☄ Cosmic Ray معطّل');
}

// ─────────────────────────────────────────────────────────────────
//  SEARCH BAR
// ─────────────────────────────────────────────────────────────────
function tgSX() {
  var qinp=document.getElementById('qinp'), sx=document.getElementById('sx');
  if (sx && qinp) sx.classList.toggle('on', qinp.value.length > 0);
}

function clrSearch() {
  var qinp=document.getElementById('qinp'), sx=document.getElementById('sx'), rsec=document.getElementById('rsec');
  if (qinp) qinp.value = '';
  if (sx)   sx.classList.remove('on');
  if (rsec) { rsec.style.display = 'none'; rsec.innerHTML = ''; }
  if (qinp) qinp.focus();
}

// ─────────────────────────────────────────────────────────────────
//  RSA BOX
// ─────────────────────────────────────────────────────────────────
function buildRSABox(rsa, N) {
  if (!rsa || !rsa.verified) return '';
  return '<div class="rsa-box">'
    + '<div class="rsa-box-title">🔐 RSA — تحليل كامل · N = ' + N + '</div>'
    + '<div class="rsa-grid">'
    + '<div class="rsa-item"><div class="rsa-item-label">n = p × q</div><div class="rsa-item-val">' + rsa.n + ' = ' + rsa.p + ' × ' + rsa.q + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">Φ(n)</div><div class="rsa-item-val" style="color:#f1c21b">' + rsa.phi + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">e (مفتاح عام)</div><div class="rsa-item-val">' + rsa.e + '</div></div>'
    + '<div class="rsa-item"><div class="rsa-item-label">d (مفتاح خاص)</div><div class="rsa-item-val" style="color:#f1c21b">' + rsa.d + '</div></div>'
    + '</div>'
    + '<div class="rsa-steps">'
    + ['١','٢','٣','٤','٥','٦'].map(function(n,i) {
        var s = rsa.steps['step'+(i+1)] || '';
        var id = (i===4)?'id="rs5"':(i===5)?'id="rs6"':'';
        return '<div class="rsa-step"><span class="rsa-step-n">'+n+'</span><span class="rsa-step-txt" '+id+'><strong>'+s+'</strong></span></div>';
      }).join('')
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">'
    + '<label style="font-family:monospace;font-size:10px;color:#8d8d8d">غيّر M:</label>'
    + '<input type="number" id="rsa-m-val" value="'+rsa.M+'" min="2" max="'+(rsa.n-1)+'" style="background:#161616;border:1px solid #4589ff;border-radius:4px;color:#fff;font-family:monospace;font-size:12px;padding:4px 8px;width:80px;outline:none">'
    + '<button onclick="updRSA('+rsa.e+','+rsa.d+','+rsa.n+')" style="background:#0f62fe;border:none;border-radius:4px;color:#fff;font-family:monospace;font-size:10px;padding:5px 12px;cursor:pointer">احسب</button>'
    + '</div>'
    + '<div id="rsa-ok" style="margin-top:8px;padding:8px 12px;background:rgba(66,190,101,.08);border:1px solid rgba(66,190,101,.2);border-radius:6px;font-family:monospace;font-size:11px;color:#42be65;text-align:center">'
    + '✓ M='+rsa.M+' → C='+rsa.C+' → M='+rsa.M_dec+' ✓</div>'
    + '</div>';
}

function updRSA(e, d, n) {
  var el=document.getElementById('rsa-m-val');
  if (!el) return;
  var M=parseInt(el.value,10);
  if (!M||M<2||M>=n){showToast('M يجب بين 2 و '+(n-1));return;}
  function mp(b,ex,m){
    if(m>9007199254){var rb=1n,bb=BigInt(b)%BigInt(m),mb=BigInt(m),eb=BigInt(ex);while(eb>0n){if(eb&1n)rb=rb*bb%mb;eb>>=1n;bb=bb*bb%mb;}return Number(rb);}
    var r=1;b=b%m;while(ex>0){if(ex%2===1)r=(r*b)%m;ex=Math.floor(ex/2);b=(b*b)%m;}return r;
  }
  var C=mp(M,e,n),Md=mp(C,d,n),ok=(Md===M);
  var s5=document.getElementById('rs5'),s6=document.getElementById('rs6'),sok=document.getElementById('rsa-ok');
  if(s5)s5.innerHTML='<strong>C = '+M+'^'+e+' mod '+n+' = <span style="color:#42be65">'+C+'</span></strong>';
  if(s6)s6.innerHTML='<strong>M = '+C+'^'+d+' mod '+n+' = <span style="color:#42be65">'+Md+'</span> '+(ok?'✓':'✗')+'</strong>';
  if(sok){sok.textContent=(ok?'✓':'✗')+' M='+M+' → C='+C+' → M='+Md+(ok?' ✓':' ✗');sok.style.color=ok?'#42be65':'#ff832b';}
}

// ─────────────────────────────────────────────────────────────────
//  MAIN SEARCH
// ─────────────────────────────────────────────────────────────────
async function doSearch() {
  if (typeof QASecurity !== 'undefined' && !QASecurity.rateLimit('search', 20)) {
    showToast('⚠ بطء قليل — 20 طلب بالدقيقة كحد أقصى'); return;
  }
  var qinp = document.getElementById('qinp');
  var rawQ = qinp ? qinp.value.trim() : '';
  if (!rawQ) return;
  var q = (typeof QASecurity !== 'undefined') ? QASecurity.sanitizeInput(rawQ) : rawQ.slice(0,1000);
  if (!q) return;
  currQ = q;
  STORE.saveLastSearch({ query: q, email: currEmail, ts: Date.now() });

  var sec = document.getElementById('rsec');
  if (!sec) return;
  sec.style.display = 'block';
  sec.innerHTML = '<div class="lbar"></div><div class="loading-txt">// ⚛ تشغيل المحاكاة الكمية... Shor 51-bit · QFT · Alias Sampling</div>';

  var ctrl = getControls();
  var ts   = new Date().toISOString();

  try {
    var queryForEngine = q;
    var isShorQuery    = /shor|شور|factor|تحليل|rsa|encrypt.*text|تشفير.*نص/i.test(q);
    var queryHasN      = /n\s*=\s*\d+/i.test(q);

    if (!queryHasN) {
      var rawNs = ctrl.Ns || '15';
      if (rawNs.length > 4) {
        queryForEngine = 'Shor N=' + rawNs;
      } else if (isShorQuery && rawNs !== '15') {
        queryForEngine = q + ' N=' + rawNs;
      }
    }

    var result = await QuantumAsk.ask(queryForEngine, uiLang, ctrl.r, ctrl.shots, { cosmicRay: ctrl.cosmic, Ns: ctrl.Ns });
    window._lastSim = result.sim;

    sec.innerHTML = ''
      + '<div class="rh"><div class="rtag">✓ نتيجة محاكاة 51-كيوبت</div>'
      + '<div class="ra"><button class="eb csv" onclick="expCSV()">📄 CSV</button>'
      + '<button class="eb xlsx" onclick="openXlsx()">📊 XLSX</button></div></div>'
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
    console.error('[doSearch]', err);
  }
}

// ─────────────────────────────────────────────────────────────────
//  CSV EXPORT
// ─────────────────────────────────────────────────────────────────
function expCSV() {
  var sim = window._lastSim;
  if (!sim) { showToast('لا توجد بيانات محاكاة بعد'); return; }
  var sorted = Object.entries(sim.counts).sort(function(a,b){return b[1]-a[1];});
  var lines  = ['Rank,State_51bit,Counts,Probability_pct,P_exact'];
  sorted.forEach(function(e,i){
    var full=e[0].padEnd(51,'0').slice(0,51);
    lines.push((i+1)+','+full+','+e[1]+','+(e[1]/sim.shots*100).toFixed(4)+','+(e[1]/sim.shots).toFixed(6));
  });
  lines.push('','# Metadata','Type,'+sim.type,'Shots,'+sim.shots);
  if (sim.type==='Shor-QFT-51'){
    lines.push('N_factored,'+sim.N,'p,'+sim.p,'q,'+sim.q,'Period_r,'+(sim.period_r||'?'),'Method,'+sim.method);
  }
  lines.push('Timestamp,'+new Date().toISOString(),'Lab,Iraq Quantum Lab v6.0','Developer,Jaafar Al-Fares');
  var blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url; a.download='IQ_Quantum_'+sim.type+'_'+Date.now()+'.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},200);
  showToast('✓ تم تنزيل '+sorted.length+' حالة');
}

// ─────────────────────────────────────────────────────────────────
//  XLSX EXPORT
// ─────────────────────────────────────────────────────────────────
function openXlsx() {
  var sim=window._lastSim;
  if (!sim){showToast('لا توجد بيانات');return;}
  var sorted=Object.entries(sim.counts).sort(function(a,b){return b[1]-a[1];});
  var tbl=document.getElementById('xprev');
  if(tbl){
    var h='<tr><th>State</th><th>Counts</th><th>Prob%</th><th>P</th></tr>';
    sorted.slice(0,3).forEach(function(e){
      var full=e[0].padEnd(51,'0').slice(0,51);
      h+='<tr><td title="'+full+'">'+full.slice(0,16)+'…</td><td>'+e[1]+'</td><td>'+(e[1]/sim.shots*100).toFixed(2)+'%</td><td>'+(e[1]/sim.shots).toFixed(4)+'</td></tr>';
    });
    tbl.innerHTML=h;
  }
  var xrc=document.getElementById('xrc'),xcc=document.getElementById('xcc'),xse=document.getElementById('xse'),xfn=document.getElementById('xfn'),ov=document.getElementById('xlsx-ov');
  if(xrc)xrc.textContent=sorted.length;
  if(xcc)xcc.textContent=4;
  if(xse)xse.textContent=Math.round(sorted.length*70/1024)+' KB';
  if(xfn)xfn.value='IQ_Quantum_'+sim.type+'_'+new Date().toISOString().slice(0,10);
  if(ov)ov.classList.add('open');
}

function closeXlsx(){var ov=document.getElementById('xlsx-ov');if(ov)ov.classList.remove('open');}

function confXlsx() {
  var sim=window._lastSim;
  if(!sim){showToast('لا توجد بيانات');return;}
  var fn=((document.getElementById('xfn')||{}).value||'IQ_Quantum').replace(/\.xlsx$/i,'');
  var sn=(document.getElementById('xsn')||{}).value||'Quantum Results';
  var sorted=Object.entries(sim.counts).sort(function(a,b){return b[1]-a[1];});
  var rows=sorted.map(function(e,i){
    var full=e[0].padEnd(51,'0').slice(0,51);
    return{'Rank':i+1,'State (51 Qubits)':full,'Counts':e[1],'Probability (%)':parseFloat((e[1]/sim.shots*100).toFixed(4)),'P(exact)':parseFloat((e[1]/sim.shots).toFixed(6))};
  });
  var H=0; sorted.forEach(function(e){var p=e[1]/sim.shots;if(p>0)H-=p*Math.log2(p);});
  var meta=[
    {Key:'Type',Value:sim.type},{Key:'Shots',Value:sim.shots},{Key:'States',Value:sorted.length},
    {Key:'Shannon H(X)',Value:H.toFixed(6)+' bits'},{Key:'Hilbert',Value:'2^51=2,251,799,813,685,248'},
  ];
  if(sim.type==='Shor-QFT-51'){
    meta.push({Key:'N',Value:String(sim.N)},{Key:'Factors',Value:sim.p+' x '+sim.q},{Key:'Period r',Value:String(sim.period_r||'?')},{Key:'Method',Value:sim.method});
  }
  meta.push({Key:'Query',Value:currQ},{Key:'Timestamp',Value:new Date().toISOString()},{Key:'Lab',Value:'Iraq Quantum Lab v6.0'},{Key:'Developer',Value:'Jaafar Al-Fares'});
  try{
    var ws=XLSX.utils.json_to_sheet(rows); ws['!cols']=[{wch:6},{wch:55},{wch:8},{wch:14},{wch:10}];
    var wm=XLSX.utils.json_to_sheet(meta); wm['!cols']=[{wch:24},{wch:55}];
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,sn); XLSX.utils.book_append_sheet(wb,wm,'Metadata');
    XLSX.writeFile(wb,fn+'.xlsx'); closeXlsx();
    showToast('✓ تم تنزيل '+sorted.length+' حالة → '+fn+'.xlsx');
  }catch(err){showToast('✗ خطأ XLSX: '+err.message);}
}

// ─────────────────────────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────────────────────────
function showToast(m, d) {
  var t=document.getElementById('toast');
  if(!t)return;
  t.innerHTML=m; t.classList.add('show');
  setTimeout(function(){t.classList.remove('show');},d||3000);
}

// ─────────────────────────────────────────────────────────────────
//  RSA BOX STYLES
// ─────────────────────────────────────────────────────────────────
(function(){
  if(document.getElementById('rsa-css'))return;
  var s=document.createElement('style'); s.id='rsa-css';
  s.textContent='.rsa-box{background:linear-gradient(135deg,#0a1628,#0d2137);border:1px solid rgba(69,137,255,.3);border-radius:12px;margin:16px 0;padding:18px 20px;direction:rtl}'
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

if (!STORE.persistent) {
  console.warn('[IQ Lab] Storage mode: ' + STORE.mode + ' (no persistence)');
}

if (!tryAutoLogin()) {
  var gate = document.getElementById('gate');
  if (gate) gate.style.display = 'flex';
}
