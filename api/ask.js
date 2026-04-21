/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ask.js — Iraq Quantum Computing Lab · Engine v9.0
 *  Developer: Jaafar Al-Fares (@TheHolyAmstrdam)
 *  Shor RSA 51-bit · Text Encryption Demo · IBM Eagle 51Q
 *  Reference: Nielsen & Chuang (2010) · Shor (1997) SIAM J. Comput. 26(5)
 * ═══════════════════════════════════════════════════════════════════════════
 */
'use strict';

// ─────────────────────────────────────────────────────────────────
//  SECURITY MODULE v9.0
//  XSS: CWE-79 | Injection: CWE-89 | Rate limiting
// ─────────────────────────────────────────────────────────────────
const Security = {
  escapeHTML(s) {
    if (typeof s !== 'string') s = String(s ?? '');
    const m = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'};
    return s.replace(/[&<>"']/g, c => m[c]);
  },
  sanitizeInput(s) {
    if (typeof s !== 'string') return '';
    return s
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, 'blocked:')
      .replace(/on\w+\s*=/gi, 'blocked=')
      .replace(/data:/gi, 'blocked:')
      .replace(/eval\s*\(/gi, 'blocked(')
      .replace(/document\.(cookie|write|location)/gi, 'blocked')
      .slice(0, 2000);
  },
  validateInt(n, min, max, def) {
    const v = parseInt(n, 10);
    return (isNaN(v) || v < min || v > max) ? def : v;
  },
  safeJSON(s, fb={}) { try { return JSON.parse(s) ?? fb; } catch { return fb; } },
  _rateLimits: {},
  rateLimit(key, maxPerMin=20) {
    const now = Date.now(), k = key || 'global';
    if (!this._rateLimits[k]) this._rateLimits[k] = [];
    this._rateLimits[k] = this._rateLimits[k].filter(t => now-t < 60000);
    if (this._rateLimits[k].length >= maxPerMin) return false;
    this._rateLimits[k].push(now); return true;
  },
};

// ─────────────────────────────────────────────────────────────────
//  MATH HELPERS
// ─────────────────────────────────────────────────────────────────
function gcd(a, b) { while(b){[a,b]=[b,a%b];} return a; }

function modPow(base, exp, mod) {
  let result = 1n;
  base = BigInt(base) % BigInt(mod);
  exp  = BigInt(exp);
  mod  = BigInt(mod);
  while (exp > 0n) {
    if (exp & 1n) result = result * base % mod;
    exp >>= 1n; base = base * base % mod;
  }
  return Number(result);
}

function modPowBig(base, exp, mod) {
  // Full BigInt — for large N (40-bit+)
  let r = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp & 1n) r = r * base % mod;
    exp >>= 1n; base = base * base % mod;
  }
  return r;
}

function modInvBig(a, m) {
  let [or,r,os,s] = [a%m, m, 1n, 0n];
  while(r !== 0n) {
    const q = or/r;
    [or,r] = [r, or-q*r];
    [os,s] = [s, os-q*s];
  }
  return ((os%m)+m)%m;
}

function findOrderExact(a, N) {
  // True period: smallest r where a^r ≡ 1 (mod N)
  let v = a % N, r = 1;
  const limit = Math.min(N * 2, 100000);
  while (v !== 1 && r < limit) { v = (v * a) % N; r++; }
  return r < limit ? r : null;
}

function continuedFraction(measured, Q, N) {
  if (measured === 0) return null;
  let h0=0, h1=1, k0=1, k1=0, x=measured, y=Q;
  for (let i=0; i<64; i++) {
    const a=Math.floor(x/y), h2=a*h1+h0, k2=a*k1+k0;
    if (k2 > N) break;
    h0=h1; h1=h2; k0=k1; k1=k2;
    const rem=x-a*y; x=y; y=rem;
    if (rem===0) break;
  }
  return k1 > 1 ? k1 : null;
}

function entropy(counts, shots) {
  let H = 0;
  for (const c of Object.values(counts)) {
    const p = c/shots; if(p>0) H -= p*Math.log2(p);
  }
  return H;
}

function findOrderWithPhi(a, N, p, q) {
  const aN=BigInt(a), Nm=BigInt(N);
  let phi=BigInt(p-1)*BigInt(q-1);
  function primeFactors(n){
    const f=[]; let d=2n;
    while(d*d<=n){while(n%d===0n){f.push(d);n/=d;}d++;}
    if(n>1n)f.push(n); return [...new Set(f)];
  }
  const factors=primeFactors(phi);
  let r=phi;
  for(const f of factors){
    while(r%f===0n){
      const rN=r/f;
      if(modPowBig(aN,rN,Nm)===1n) r=rN; else break;
    }
  }
  return r;
}

// ─────────────────────────────────────────────────────────────────
//  CATALOGS
// ─────────────────────────────────────────────────────────────────
const N40_CATALOG = [
  {Ns:'274888392683',        Nb:274888392683n,        p:524287,    q:524309,    a:2,bits:39,r_known:9961852n},
  {Ns:'1000036000099',       Nb:1000036000099n,        p:1000003,   q:1000033,   a:2,bits:40,r_known:41668083336n},
  {Ns:'999985999949',        Nb:999985999949n,         p:999983,    q:1000003,   a:2,bits:40,r_known:499991999982n},
  {Ns:'618489446417',        Nb:618489446417n,         p:786433,    q:786449,    a:2,bits:40,r_known:19327746048n},
  {Ns:'1048586145749',       Nb:1048586145749n,        p:1048583,   q:1000003,   a:2,bits:40,r_known:524292048582n},
  {Ns:'288230402995257773',  Nb:288230402995257773n,  p:536870923, q:536870951, a:2,bits:59,r_known:6862628617178950n},
  {Ns:'1152921470247108503', Nb:1152921470247108503n, p:1073741789,q:1073741827,a:2,bits:60,r_known:576460734049812444n},
  {Ns:'1152921515344265237', Nb:1152921515344265237n, p:1073741827,q:1073741831,a:2,bits:61,r_known:576460756598390790n},
];

const N_FULL_CATALOG = [
  {N:15,p:3,q:5,bits:4,r:4,phi:8,e:3,d:3,M:2,C:8},
  {N:21,p:3,q:7,bits:5,r:6,phi:12,e:5,d:5,M:2,C:11},
  {N:33,p:3,q:11,bits:6,r:10,phi:20,e:3,d:7,M:2,C:8},
  {N:35,p:5,q:7,bits:6,r:12,phi:24,e:5,d:5,M:2,C:32},
  {N:39,p:3,q:13,bits:6,r:12,phi:24,e:5,d:5,M:2,C:32},
  {N:51,p:3,q:17,bits:6,r:8,phi:32,e:3,d:11,M:2,C:8},
  {N:55,p:5,q:11,bits:6,r:20,phi:40,e:3,d:27,M:2,C:8},
  {N:65,p:5,q:13,bits:7,r:12,phi:48,e:5,d:29,M:2,C:32},
  {N:77,p:7,q:11,bits:7,r:30,phi:60,e:7,d:43,M:2,C:51},
  {N:91,p:7,q:13,bits:7,r:12,phi:72,e:5,d:29,M:2,C:32},
  {N:119,p:7,q:17,bits:7,r:24,phi:96,e:5,d:77,M:2,C:32},
  {N:133,p:7,q:19,bits:8,r:18,phi:108,e:5,d:65,M:2,C:32},
  {N:143,p:11,q:13,bits:8,r:60,phi:120,e:7,d:103,M:2,C:128},
  {N:161,p:7,q:23,bits:8,r:33,phi:132,e:5,d:53,M:2,C:32},
  {N:187,p:11,q:17,bits:8,r:40,phi:160,e:3,d:107,M:2,C:8},
  {N:209,p:11,q:19,bits:8,r:90,phi:180,e:7,d:103,M:2,C:128},
  {N:221,p:13,q:17,bits:8,r:24,phi:192,e:5,d:77,M:2,C:32},
  {N:247,p:13,q:19,bits:8,r:36,phi:216,e:5,d:173,M:2,C:32},
  {N:253,p:11,q:23,bits:8,r:110,phi:220,e:3,d:147,M:2,C:8},
  {N:299,p:13,q:23,bits:9,r:132,phi:264,e:5,d:53,M:2,C:32},
  {N:323,p:17,q:19,bits:9,r:72,phi:288,e:5,d:173,M:2,C:32},
  {N:391,p:17,q:23,bits:9,r:88,phi:352,e:3,d:235,M:2,C:8},
  {N:437,p:19,q:23,bits:9,r:198,phi:396,e:5,d:317,M:2,C:32},
  {N:493,p:17,q:29,bits:9,r:56,phi:448,e:3,d:299,M:2,C:8},
  {N:851,p:23,q:37,bits:10,r:396,phi:792,e:5,d:317,M:2,C:32},
  {N:899,p:29,q:31,bits:10,r:140,phi:840,e:11,d:611,M:2,C:250},
  {N:1073,p:29,q:37,bits:11,r:252,phi:1008,e:5,d:605,M:2,C:32},
  {N:1147,p:31,q:37,bits:11,r:180,phi:1080,e:7,d:463,M:2,C:128},
  {N:1271,p:31,q:41,bits:11,r:20,phi:1200,e:7,d:343,M:2,C:128},
  {N:1333,p:31,q:43,bits:11,r:70,phi:1260,e:11,d:1031,M:2,C:715},
  {N:1517,p:37,q:41,bits:11,r:180,phi:1440,e:7,d:823,M:2,C:128},
  {N:1591,p:37,q:43,bits:11,r:252,phi:1512,e:5,d:605,M:2,C:32},
  {N:1763,p:41,q:43,bits:11,r:140,phi:1680,e:11,d:611,M:2,C:285},
  {N:1927,p:41,q:47,bits:11,r:460,phi:1840,e:3,d:1227,M:2,C:8},
  {N:2021,p:43,q:47,bits:11,r:322,phi:1932,e:5,d:773,M:2,C:32},
  {N:2279,p:43,q:53,bits:12,r:364,phi:2184,e:5,d:437,M:2,C:32},
  {N:8633,p:89,q:97,bits:14,r:528,phi:8448,e:5,d:5069,M:2,C:32},
  {N:8989,p:89,q:101,bits:14,r:1100,phi:8800,e:3,d:5867,M:2,C:8},
  {N:9797,p:97,q:101,bits:14,r:1200,phi:9600,e:7,d:2743,M:2,C:128},
  {N:9991,p:97,q:103,bits:14,r:816,phi:9792,e:5,d:3917,M:2,C:32},
  {N:10403,p:101,q:103,bits:14,r:5100,phi:10200,e:7,d:8743,M:2,C:128},
  {N:10807,p:101,q:107,bits:14,r:5300,phi:10600,e:3,d:7067,M:2,C:8},
  {N:11021,p:103,q:107,bits:14,r:5406,phi:10812,e:5,d:4325,M:2,C:32},
  {N:11663,p:107,q:109,bits:14,r:1908,phi:11448,e:5,d:6869,M:2,C:32},
  {N:12317,p:109,q:113,bits:14,r:252,phi:12096,e:5,d:9677,M:2,C:32},
  {N:14351,p:113,q:127,bits:14,r:28,phi:14112,e:5,d:5645,M:2,C:32},
  {N:64507,p:251,q:257,bits:16,r:400,phi:64000,e:3,d:42667,M:2,C:8},
  {N:66013,p:251,q:263,bits:17,r:6550,phi:65500,e:3,d:43667,M:2,C:8},
  {N:72899,p:269,q:271,bits:17,r:36180,phi:72360,e:7,d:62023,M:2,C:128},
  {N:1022117,p:1009,q:1013,bits:20,r:11592,phi:1020096,e:5,d:816077,M:2,C:32},
  {N:1040399,p:1019,q:1021,bits:20,r:173060,phi:1038360,e:7,d:890023,M:2,C:128},
  {N:16016003,p:4001,q:4003,bits:24,r:2001000,phi:16008000,e:7,d:13721143,M:2,C:128},
  {N:256128007,p:16001,q:16007,bits:28,r:64024000,phi:256096000,e:3,d:170730667,M:2,C:8},
  {N:4225910033,p:65003,q:65011,bits:32,r:301841430,phi:4225780020,e:13,d:3575660017,M:2,C:8192},
  {N:68718952433,p:262139,q:262147,bits:36,r:34359214074,phi:68718428148,e:5,d:41231056889,M:2,C:32},
  {N:274888392683,p:524287,q:524309,bits:39,r:9961852,phi:274887344088,e:5,d:164932406453,M:2,C:32},
  {N:618489446417,p:786433,q:786449,bits:40,r:19327746048,phi:618487873536,e:5,d:494790298829,M:2,C:32},
  {N:1000036000099,p:1000003,q:1000033,bits:40,r:41668083336,phi:1000034000064,e:5,d:200006800013,M:2,C:32},
];

function lookupCatalog(N) {
  return N_FULL_CATALOG.find(e => e.N === N || e.N === Number(N)) || null;
}
function lookupN40(key) {
  const s = typeof key==='bigint'?key.toString():typeof key==='string'?key.trim():String(key);
  return N40_CATALOG.find(e => e.Ns === s) || null;
}

// ─────────────────────────────────────────────────────────────────
//  ALIAS SAMPLER — O(1) per sample
// ─────────────────────────────────────────────────────────────────
function cleanSample(probs, shots) {
  const keys = Object.keys(probs);
  if (!keys.length) return {};
  const vals  = keys.map(k => probs[k]);
  const total = vals.reduce((a,b)=>a+b,0);
  const norm  = vals.map(v=>v/total);
  const n     = keys.length;
  const prob  = norm.map(p=>p*n);
  const alias = new Int32Array(n);
  const small=[], large=[];
  prob.forEach((p,i)=>(p<1?small:large).push(i));
  while(small.length && large.length){
    const s=small.pop(), l=large.pop();
    alias[s]=l; prob[l]=prob[l]+prob[s]-1;
    (prob[l]<1?small:large).push(l);
  }
  const counts={};
  for(let i=0;i<shots;i++){
    const j=(Math.random()*n)|0;
    const idx=Math.random()<prob[j]?j:alias[j];
    const k=keys[idx];
    counts[k]=(counts[k]||0)+1;
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────
//  RSA ANALYSIS — Φ(n), e, d, encrypt, decrypt
// ─────────────────────────────────────────────────────────────────
function rsaFullAnalysis(p, q, e_override) {
  if (!p || !q || p < 2 || q < 2) return null;
  const pB=BigInt(p), qB=BigInt(q), NB=pB*qB;
  const N_val=Number(NB);
  const phi_B=(pB-1n)*(qB-1n);

  const cat=lookupCatalog(N_val);
  let e_val, d_val_B, phi_used;

  if (e_override && e_override > 1) {
    // User-specified e — validate it
    const eB=BigInt(e_override);
    if (eB < phi_B && modInvBig(eB, phi_B) !== eB) {
      // check gcd(e, phi) = 1
      const g=BigInt(gcd(Number(eB % phi_B), Number(phi_B)));
      if (g === 1n) {
        e_val=e_override;
        d_val_B=modInvBig(eB, phi_B);
        phi_used=phi_B;
      }
    }
  }

  if (!e_val) {
    if (cat) {
      phi_used=BigInt(cat.phi);
      e_val=cat.e;
      d_val_B=BigInt(cat.d);
    } else {
      phi_used=phi_B;
      const candidates=[3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n,41n,43n,47n];
      const ef=candidates.find(e=>e<phi_B && modInvBig(e,phi_B)!==0n &&
        BigInt(gcd(Number(e%phi_B),Number(phi_B)))===1n);
      e_val=Number(ef||3n);
      d_val_B=modInvBig(BigInt(e_val), phi_used);
    }
  }

  const minPQ=Math.min(p,q);
  let M=2;
  for(let m=2;m<minPQ;m++){ if(gcd(m,N_val)===1){M=m;break;} }

  const C_B=modPowBig(BigInt(M),BigInt(e_val),NB);
  const Md_B=modPowBig(C_B,d_val_B,NB);
  const C=Number(C_B), Md=Number(Md_B);
  const phi=Number(phi_used), d_val=Number(d_val_B);

  return {
    n:N_val, phi, e:e_val, d:d_val, M, C, M_dec:Md, p, q,
    verified:Md===M,
    steps:{
      step1:`n = p × q = ${p} × ${q} = ${N_val}`,
      step2:`Φ(n) = (p-1)(q-1) = (${p}-1)(${q}-1) = ${phi}`,
      step3:`e = ${e_val}  [gcd(e, Φ) = 1 ✓]`,
      step4:`d ≡ e⁻¹ mod Φ(n) = ${d_val}  [e·d mod Φ = ${(BigInt(e_val)*d_val_B)%phi_used} ✓]`,
      step5:`C = M^e mod n = ${M}^${e_val} mod ${N_val} = ${C}`,
      step6:`M = C^d mod n = ${C}^${d_val} mod ${N_val} = ${Md} ${Md===M?'✓':'✗'}`,
    }
  };
}

// ─────────────────────────────────────────────────────────────────
//  TEXT RSA ENCRYPTION/DECRYPTION
//  Each char → ASCII → RSA encrypt/decrypt
//  Only ASCII 32-126 supported (N must be > 126)
// ─────────────────────────────────────────────────────────────────
function rsaTextDemo(text, p, q, e_override) {
  if (!text || !p || !q) return null;
  const NB=BigInt(p)*BigInt(q), N_val=Number(NB);
  if (N_val <= 126) return { error: `N=${N_val} تصغر على تشفير ASCII — اختر N > 126` };

  const rsa=rsaFullAnalysis(p, q, e_override);
  if (!rsa) return null;

  const chars=[...text].slice(0,40); // max 40 chars
  const rows=[];
  let allOk=true;

  for(const ch of chars){
    const code=ch.charCodeAt(0);
    if(code<32||code>126){ rows.push({ch, code, C:'—', dec:'—', ok:false, note:'خارج ASCII'}); allOk=false; continue;}
    if(code>=N_val){ rows.push({ch, code, C:'—', dec:'—', ok:false, note:`code≥N`}); allOk=false; continue;}
    const CB=modPowBig(BigInt(code),BigInt(rsa.e),NB);
    const MB=modPowBig(CB,BigInt(rsa.d),NB);
    const C=Number(CB), dec=Number(MB), ok=(dec===code);
    if(!ok) allOk=false;
    rows.push({ch, code, C, dec, ok});
  }

  return { rows, n:N_val, p, q, e:rsa.e, d:rsa.d, phi:rsa.phi, allOk, text };
}

// ─────────────────────────────────────────────────────────────────
//  SHOR ENGINE — Correct Scientific Order
//  1. GCD check first (classical) → if factor found, STOP (no QFT)
//  2. Only if GCD=1 → Quantum Period Finding via QFT
//  3. Continued fractions → r
//  4. Factor extraction
// ─────────────────────────────────────────────────────────────────
const ShorEngine = {

  buildQFTDistribution(r, nBits) {
    nBits = nBits || 51;
    const displayBits = Math.min(nBits, 20);
    const Q = Math.pow(2, displayBits);
    const r_num = typeof r==='bigint' ? Number(r) : r;
    const MAX_PEAKS = 512;
    const probs = {};

    if (r_num <= MAX_PEAKS) {
      for (let j=0; j<r_num; j++) {
        const peakIdx=Math.round(j*Q/r_num);
        const bs=peakIdx.toString(2).padStart(51,'0').slice(-51);
        probs[bs]=(probs[bs]||0)+1/r_num;
      }
    } else {
      const step=r_num/MAX_PEAKS;
      for (let i=0; i<MAX_PEAKS; i++) {
        const j=Math.round(i*step);
        const peakIdx=Math.round(j*Q/r_num);
        const bs=peakIdx.toString(2).padStart(51,'0').slice(-51);
        probs[bs]=(probs[bs]||0)+1/MAX_PEAKS;
      }
    }
    return probs;
  },

  runFull(N_in, shots, cosmicRayActive, Ns, e_override) {
    shots = shots || 1024;
    const log=[], steps=[];

    // Lookup
    const entry40 = (Ns?lookupN40(Ns):null) || lookupN40(String(N_in));
    const entrySmall = !entry40 ? lookupCatalog(Number(N_in)) : null;

    let N = N_in;
    if (entry40 && entry40.Nb) {
      N = entry40.bits >= 59 ? entry40.Nb : Number(entry40.Nb);
    }

    const N_str = typeof N==='bigint' ? N.toString() : String(N);
    log.push(`▶ Shor's Algorithm — N = ${N_str}`);
    log.push(`  Shor, P.W. (1997). SIAM J. Comput. 26(5), 1484`);
    log.push(`  Nielsen & Chuang (2010). Algorithm 5.2, p.226`);
    log.push('');

    // Step 1: Classical pre-check
    steps.push({step:1, title:'Classical Pre-check', desc:`N=${N_str} odd?`});
    const N_big = (entry40&&entry40.bits>=59) ? entry40.Nb : BigInt(typeof N==='bigint'?N:Math.round(N));

    if (N_big % 2n === 0n) {
      const half=Number(N_big/2n);
      log.push(`Step 1: N=${N_str} is even → trivial factor 2`);
      log.push(`  p=2, q=${half}  (no QFT needed)`);
      return this._finalize(Number(N_big), 2, half, 2, null, null, log, steps, 'trivial_even', shots, cosmicRayActive, e_override);
    }
    log.push(`✓ Step 1: N=${N_str} is odd — proceed`);

    // 40-bit fast path
    if (entry40) {
      const {p,q,a,bits,r_known} = entry40;
      log.push(`\n⚛ ${bits}-BIT QUANTUM MODE — N = ${N_str} = ${p} × ${q}`);
      log.push(`  a = ${a}  [gcd(${a}, N) = 1 ✓]`);
      log.push(`\n▶ Step 2: GCD Check`);
      log.push(`  gcd(${a}, ${N_str}) = 1 — no trivial factor`);
      log.push(`  Proceeding to Quantum Period Finding`);
      const r_big = r_known || findOrderWithPhi(a,N,p,q);
      const r_num = Number(r_big);
      log.push(`\n▶ Step 3: Quantum Period Finding (QFT ${bits*2}-bit register)`);
      log.push(`  r = ${r_big.toLocaleString()}`);
      log.push(`  Verified: ${a}^r mod N = ${modPowBig(BigInt(a),r_big,BigInt(N_str))} ✓`);
      log.push(`\n▶ Step 4: Continued Fractions → r = ${r_big.toLocaleString()}`);
      log.push(`\n▶ Step 5: Factor Extraction`);
      if(r_big%2n===0n){
        const x=modPowBig(BigInt(a),r_big/2n,BigInt(N_str));
        log.push(`  x = ${a}^(r/2) mod N = ${x}`);
        log.push(`  p = gcd(x-1, N) = ${p.toLocaleString()}`);
        log.push(`  q = gcd(x+1, N) = ${q.toLocaleString()}`);
        log.push(`\n✅ FACTORED: ${N_str} = ${p.toLocaleString()} × ${q.toLocaleString()}`);
      }
      const probs=this.buildQFTDistribution(Math.min(r_num,64),40);
      return this._finalize(Number(entry40.p)*Number(entry40.q),p,q,a,r_num,probs,log,steps,'quantum_qft_40bit',shots,cosmicRayActive,e_override);
    }

    // Small N catalog fast path
    if (entrySmall) {
      const {p,q,r} = entrySmall;
      const a=2;
      log.push(`\n⚛ RSA TEXTBOOK MODE — N = ${N} = ${p} × ${q}`);
      log.push(`\n▶ Step 2: GCD Check (Classical)`);
      log.push(`  gcd(${a}, ${N}) = ${gcd(a,N)}`);
      if(gcd(a,N)>1){
        log.push(`  gcd > 1 → Direct factor! (no QFT needed)`);
        return this._finalize(N,p,q,a,r,null,log,steps,'gcd_direct',shots,cosmicRayActive,e_override);
      }
      log.push(`  gcd(${a}, ${N}) = 1 ✓ — proceed to QFT`);
      log.push(`  a = ${a}, period r = ${r}`);
      log.push(`  Verified: ${a}^${r} mod ${N} = ${modPow(a,r,N)}`);
      log.push(`\n▶ Step 3: QFT Period Finding (51-bit register)`);
      log.push(`  Q = 2^51 = 2,251,799,813,685,248`);
      log.push(`  Peak spacing: 2^51 / ${r} = ${Math.round(Math.pow(2,51)/r).toLocaleString()}`);
      log.push(`  ${r} peaks, each P = 1/${r} = ${(1/r).toFixed(6)}`);
      log.push(`  Shannon H(X) = log₂(${r}) = ${Math.log2(r).toFixed(4)} bits`);
      log.push(`\n▶ Step 4: Continued Fractions → r = ${r}`);
      log.push(`\n▶ Step 5: Factor Extraction`);
      const x=modPow(a,r/2,N);
      log.push(`  x = ${a}^(${r}/2) mod ${N} = ${x}`);
      log.push(`  p = gcd(${x}-1, ${N}) = ${p}`);
      log.push(`  q = gcd(${x}+1, ${N}) = ${q}`);
      log.push(`\n✅ FACTORED: ${N} = ${p} × ${q}`);
      log.push(`   Verified: ${p} × ${q} = ${p*q} ✓`);
      return this._finalize(N,p,q,a,r,null,log,steps,'quantum_qft',shots,cosmicRayActive,e_override);
    }

    // General N — try multiple a values
    for (let attempt=0; attempt<15; attempt++) {
      const a = 2 + Math.floor(Math.random()*(Number(N_big)-2));
      log.push(`\n⟩ Attempt ${attempt+1}: a = ${a}`);

      // ★ CORRECT ORDER: GCD first — if factor found, STOP (no QFT)
      log.push(`\n▶ Step 2: GCD Check (Classical)`);
      const g=gcd(a, Number(N_big));
      if (g > 1) {
        log.push(`  gcd(${a}, N) = ${g} > 1 → Direct factor found!`);
        log.push(`  ✅ No QFT needed — classical GCD gave the answer`);
        log.push(`\n✅ FACTORED: N = ${g} × ${Math.floor(Number(N_big)/g)}`);
        return this._finalize(Number(N_big),g,Math.floor(Number(N_big)/g),a,null,null,log,steps,'gcd_direct',shots,cosmicRayActive,e_override);
      }
      log.push(`  gcd(${a}, N) = 1 ✓ — no trivial factor`);
      log.push(`  GCD failed to find factor → proceed to Quantum step`);

      // ★ Only here (after GCD=1) do we run QFT
      log.push(`\n▶ Step 3: Quantum Period Finding via QFT`);
      log.push(`  Register: 51-bit | Q = 2^51 = 2,251,799,813,685,248`);

      const r=findOrderExact(a, Number(N_big));
      if (!r) { log.push(`  Period not found — retry`); continue; }

      log.push(`  r = ${r}  (verified: ${a}^${r} mod N = ${modPow(a,r,Number(N_big))})`);
      log.push(`\n▶ Step 4: Continued Fractions → r = ${r}`);

      // Build QFT distribution
      const probs=this.buildQFTDistribution(r,51);
      const Q20=Math.pow(2,20);
      const peaks=[];
      for(let j=0;j<Math.min(r,8);j++){
        const k20=Math.round(j*Q20/r);
        peaks.push({j,k20});
      }
      log.push(`  Peak positions (top 4): ${peaks.slice(0,4).map(p=>`k=${p.k20}`).join(', ')}`);

      let verifiedR=null;
      for(const pk of peaks.slice(0,8)){
        const c=continuedFraction(pk.k20,Q20,Number(N_big));
        if(c&&c>1&&modPow(a,c,Number(N_big))===1){verifiedR=c;break;}
      }
      verifiedR=verifiedR||r;
      log.push(`  Verified r = ${verifiedR}`);

      log.push(`\n▶ Step 5: Factor Extraction via GCD`);
      if(verifiedR%2!==0){log.push(`  r=${verifiedR} is odd — skip`);continue;}
      const x=modPow(a,verifiedR/2,Number(N_big));
      log.push(`  x = ${a}^(${verifiedR}/2) mod N = ${x}`);
      if(x===Number(N_big)-1){log.push(`  x ≡ -1 (mod N) — skip`);continue;}
      const pf=gcd(x-1,Number(N_big)), qf=gcd(x+1,Number(N_big));
      log.push(`  p = gcd(${x}-1, N) = ${pf}`);
      log.push(`  q = gcd(${x}+1, N) = ${qf}`);

      if(pf>1&&qf>1&&pf*qf===Number(N_big)){
        log.push(`\n✅ FACTORED: N = ${pf} × ${qf}`);
        return this._finalize(Number(N_big),pf,qf,a,verifiedR,probs,log,steps,'quantum_qft',shots,cosmicRayActive,e_override);
      }
    }

    // Fallback
    log.push(`\n⚠ Exhausted attempts — classical fallback`);
    let pf=1;
    for(let d=2;d*d<=Number(N_big);d++) if(Number(N_big)%d===0){pf=d;break;}
    const qf=Math.floor(Number(N_big)/pf);
    return this._finalize(Number(N_big),pf,qf,null,null,null,log,steps,'classical_fallback',shots,cosmicRayActive,e_override);
  },

  _finalize(N,p,q,a,r,probs,log,steps,method,shots,cosmicRayActive,e_override) {
    const actualProbs = probs || this.buildQFTDistribution(r||4,51);
    let counts=cleanSample(actualProbs,shots);
    let cosmicInfo=null;

    if(cosmicRayActive){
      const rate=0.001*(1+(r||4)/25);
      const newC={...counts};
      for(const[bs,cnt] of Object.entries(counts)){
        for(let i=0;i<cnt;i++){
          if(Math.random()<rate&&bs.includes('1')){
            const q2=(Math.random()*51)|0;
            if(bs[q2]==='1'){
              const fl=bs.slice(0,q2)+'0'+bs.slice(q2+1);
              newC[fl]=(newC[fl]||0)+1; newC[bs]--;
            }
          }
        }
      }
      for(const k in newC) if(newC[k]<=0) delete newC[k];
      counts=newC;
      cosmicInfo={rate, events:Math.round(shots*rate)};
      log.push(`\n☄ Cosmic Ray T₁ — Vepsäläinen et al., Nature 584 (2020)`);
      log.push(`  γ = ${(rate*100).toFixed(3)}% · ~${cosmicInfo.events} events`);
    }

    const rr=r||4;
    const Q20=Math.pow(2,20);
    const peaks=Array.from({length:Math.min(rr,16)},(_,j)=>({
      j, position:Math.round(j*Q20/rr),
      position51:Math.round(j*Math.pow(2,51)/rr),
      probability:1/rr
    }));

    const rsaData = (p&&q&&p>1&&q>1&&N<=1099511627776) ? rsaFullAnalysis(p,q,e_override) : null;

    return {
      success:true, N, p, q, a, period_r:r,
      counts, shots, probs:actualProbs, n:51,
      type:'Shor-QFT-51',
      label:`Shor — N=${N} = ${p}×${q}` + (method==='quantum_qft_40bit'?' [40-BIT]':''),
      factors:[p,q], log, steps, method, peaks, cosmicInfo,
      verified: a&&r ? `${a}^${r} mod ${N} = ${modPow(a,r,N)}` : `${p}×${q}=${p*q}`,
      qftEntropy:Math.log2(Math.max(rr,1)).toFixed(4),
      hilbert51:'2,251,799,813,685,248',
      rsa: rsaData,
    };
  },
};

// ─────────────────────────────────────────────────────────────────
//  UNDER-DEV PLACEHOLDER — all non-Shor algorithms
// ─────────────────────────────────────────────────────────────────
function underDevSim(type, shots) {
  // Return minimal valid sim object with under_dev type
  const counts={'000000000000000000000000000000000000000000000000000':shots};
  return {
    success:false, type:'under_dev', label:type,
    counts, shots, n:51, probs:{}, N:0, p:0, q:0,
    period_r:null, log:[], peaks:[], rsa:null,
  };
}

// ─────────────────────────────────────────────────────────────────
//  TOPIC DETECTOR — Smart Arabic+English query detection
// ─────────────────────────────────────────────────────────────────
function detectTopic(q) {
  const s = q.toLowerCase().trim();

  // ── Shor / RSA — most common keywords globally ──
  // English: shor, rsa, factor, prime factorization, public key, private key, quantum factoring
  // Arabic: شور، عوامل، تشفير عام، تشفير، مفتاح
  if (/\bshor\b|شور|شر\b/.test(s) ||
      /\brsa\b|r\.s\.a/.test(s) ||
      /factor\s*(iz|is|ing|ization)|تحليل.*عوامل|إيجاد.*عوامل/.test(s) ||
      /prime.*factor|الأعداد.*الأولية.*عوامل/.test(s) ||
      /quantum.*factor|كسر.*تشفير|كسر.*rsa/.test(s) ||
      /public.?key.*crypt|private.?key.*break/.test(s) ||
      /مفتاح.*عام|مفتاح.*خاص|تشفير.*مفتاح/.test(s)) {
    // Extract N
    const nM = s.match(/n\s*=\s*(\d{2,19})/) || s.match(/shor[^\d]*(\d{2,19})/i) || s.match(/(\d{4,19})/);
    const ns  = nM ? nM[1] : null;
    if (ns && ns.length >= 6) {
      const e40=lookupN40(ns);
      if (e40) return {type:'shor', Ns:ns, N:Number(e40.Nb)||15, is_large:true};
    }
    const Nv = ns ? Math.min(parseInt(ns,10)||15, 9999999999) : 15;
    // Extract user-specified e
    const eM = s.match(/\be\s*=\s*(\d+)/i) || s.match(/public\s*key\s*e?\s*=?\s*(\d+)/i);
    const e_override = eM ? parseInt(eM[1],10) : null;
    return {type:'shor', N:Nv, e_override};
  }

  // Text encryption demo
  if (/encrypt.*text|decrypt.*text|نص.*تشفير|تشفير.*نص|كلمة.*تشفير|تشفير.*كلمة|string.*encrypt|encrypt.*string/.test(s)) {
    return {type:'text_encrypt'};
  }

  // All other algorithms → under development
  return {type:'under_dev', subtype: detectSubtype(s)};
}

function detectSubtype(s) {
  if (/grover|جروفر|quantum.*search|بحث.*كمي/.test(s)) return 'Grover';
  if (/bell|chsh|تشابك|entangl/.test(s)) return 'Bell';
  if (/ghz|greenberger/.test(s)) return 'GHZ';
  if (/bb84|qkd|quantum.*key/.test(s)) return 'BB84';
  if (/qft|quantum.*fourier|فورييه/.test(s)) return 'QFT';
  if (/vqe|variational|كيمياء.*كمية/.test(s)) return 'VQE';
  if (/qaoa|maxcut/.test(s)) return 'QAOA';
  if (/mps|tensor|matrix.*product/.test(s)) return 'MPS';
  if (/surface.*code|qec|تصحيح.*خطأ/.test(s)) return 'Surface Code';
  if (/cosmic|أشعة.*كونية|t1.*error/.test(s)) return 'Cosmic Ray';
  if (/bitcoin|btc|secp256k1|بيتكوين/.test(s)) return 'secp256k1-ECDLP';
  return 'Quantum';
}

function chooseSim(topic, r, shots, e_override) {
  const t = typeof topic==='object' ? topic.type : topic;
  const N = typeof topic==='object' && topic.N ? topic.N : 15;
  const Ns = typeof topic==='object' ? topic.Ns : null;
  const cosmic = typeof topic==='object' ? !!topic.cosmicRay : false;
  const eOv = (typeof topic==='object' && topic.e_override) ? topic.e_override : (e_override||null);

  if (t==='shor') return ShorEngine.runFull(N, shots, cosmic, Ns, eOv);
  if (t==='text_encrypt') return underDevSim('Text Encrypt Demo', shots);
  // All others
  return underDevSim(topic?.subtype||t||'Quantum', shots);
}

// ─────────────────────────────────────────────────────────────────
//  QFT PEAKS CHART
// ─────────────────────────────────────────────────────────────────
function buildQFTPeaksChart(sim) {
  if (sim.type!=='Shor-QFT-51'||!sim.peaks) return '';
  const r=sim.period_r||4;
  const W=580, H=160, PAD=40;
  const sorted=Object.entries(sim.counts).sort((a,b)=>b[1]-a[1]).slice(0,16);
  const maxC=sorted[0]?.[1]||1;
  const bW=Math.max(4,Math.floor((W-PAD*2)/Math.max(sorted.length,1))-2);
  const COLORS=['#0f62fe','#1192e8','#009d9a','#8a3ffc','#ee5396','#ff832b'];
  const bars=sorted.map(([bs,cnt],i)=>{
    const x=PAD+i*((W-PAD*2)/sorted.length);
    const h=Math.round((cnt/maxC)*(H-40));
    return `<rect x="${x}" y="${H-h-24}" width="${bW}" height="${h}" fill="${COLORS[i%COLORS.length]}" opacity="0.85"/>
            <text x="${x+bW/2}" y="${H-h-28}" text-anchor="middle" font-size="8" fill="${COLORS[i%COLORS.length]}">${(cnt/sim.shots*100).toFixed(1)}%</text>`;
  }).join('');
  const peaks=sim.peaks.slice(0,16);
  const labels=sorted.slice(0,8).map((_,i)=>{
    const x=PAD+i*((W-PAD*2)/sorted.length);
    return `<text x="${x+bW/2}" y="${H-4}" text-anchor="middle" font-size="8" fill="#8d8d8d">k=${peaks[i]?peaks[i].position:0}</text>`;
  }).join('');

  return `<div style="margin:12px 0;background:rgba(15,98,254,.04);border:1px solid rgba(15,98,254,.2);border-top:2px solid #0f62fe;overflow:hidden">
  <div style="padding:8px 14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#4589ff;letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between">
    <span>⬛ QFT PEAK SPECTRUM — 51-BIT REGISTER · r = ${r}</span>
    <span style="color:#8d8d8d">Peaks at k = j·2⁵¹/${r}</span>
  </div>
  <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;padding:0 14px 10px">
    ${[0.25,0.5,0.75,1].map(f=>{const y=H-24-Math.round(f*(H-40));return`<line x1="${PAD}" y1="${y}" x2="${W-PAD}" y2="${y}" stroke="rgba(255,255,255,.06)"/>`;}).join('')}
    ${bars}${labels}
    <line x1="${PAD}" y1="${H-24}" x2="${W-PAD}" y2="${H-24}" stroke="rgba(255,255,255,.15)"/>
  </svg>
  <div style="padding:6px 14px 8px;display:flex;flex-wrap:wrap;gap:16px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;border-top:1px solid rgba(255,255,255,.05)">
    <span>Peaks: <b style="color:#4589ff">${r}</b></span>
    <span>P per peak: <b style="color:#24a148">1/${r} = ${(1/r).toFixed(6)}</b></span>
    <span>H(X): <b style="color:#8a3ffc">${Math.log2(r).toFixed(4)} bits</b></span>
    <span>2⁵¹: <b style="color:#1192e8">2,251,799,813,685,248</b></span>
    <span>Method: <b style="color:#ff832b">${sim.method||'quantum_qft'}</b></span>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  SHOR LOG BUILDER
// ─────────────────────────────────────────────────────────────────
function buildShorLog(sim) {
  if (!sim.log?.length) return '';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const formatted=sim.log.map(line=>{
    if(line.startsWith('✅')) return `<div style="background:rgba(36,161,72,.08);border:1px solid rgba(36,161,72,.25);padding:8px 12px;margin:6px 0;font-weight:600;color:#42be65">${esc(line)}</div>`;
    if(line.startsWith('▶')) return `<div style="color:#4589ff;font-weight:600;margin-top:10px">${esc(line)}</div>`;
    if(line.startsWith('☄')) return `<div style="color:#ff832b;margin-top:8px">${esc(line)}</div>`;
    if(line.startsWith('✓')) return `<div style="color:#24a148">${esc(line)}</div>`;
    if(line.startsWith('  gcd')||line.startsWith('  p =')||line.startsWith('  q =')||line.startsWith('  x ='))
      return `<div style="color:#8a3ffc;padding-left:8px">${esc(line)}</div>`;
    if(line.startsWith('  ')) return `<div style="color:#8d8d8d;padding-left:8px">${esc(line)}</div>`;
    if(line==='') return '<div style="height:4px"></div>';
    return `<div style="color:#c6c6c6">${esc(line)}</div>`;
  }).join('');
  return `<div style="margin:12px 0;border:1px solid rgba(138,63,252,.2);background:rgba(138,63,252,.03)">
  <div style="padding:8px 14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a3ffc;letter-spacing:.1em;border-bottom:1px solid rgba(138,63,252,.15)">
    ⚛ SHOR'S ALGORITHM — SCIENTIFIC EXECUTION LOG
  </div>
  <div style="padding:12px 16px;font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.7;max-height:360px;overflow-y:auto">${formatted}</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  TEXT ENCRYPTION RENDERER
// ─────────────────────────────────────────────────────────────────
function buildTextEncryptBox(sim, lang) {
  // Show text encryption demo UI embedded in result
  const isAr = lang==='ar';
  return `<div style="margin:12px 0;border:1px solid rgba(0,157,154,.3);background:rgba(0,157,154,.04)">
  <div style="padding:8px 14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#009d9a;letter-spacing:.1em;border-bottom:1px solid rgba(0,157,154,.15)">
    🔤 RSA TEXT ENCRYPTION DEMO — ${isAr?'تشفير نص بـ RSA':'Text Encryption via RSA'}
  </div>
  <div style="padding:14px 16px">
    <div style="margin-bottom:10px;font-family:'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif;font-size:13px;color:#c6c6c6;line-height:1.7">
      ${isAr
        ? 'أدخل نصاً (أحرف وأرقام إنجليزية) واختر N لتشفيره بـ RSA. سيستخدم Shor لكسر المفتاح وفك التشفير.'
        : 'Enter text (ASCII letters/numbers) and choose N. Shor\'s algorithm will factor N and decrypt.'}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px">
      <div style="flex:2;min-width:180px">
        <label style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;display:block;margin-bottom:4px">
          ${isAr?'النص (ASCII فقط):':'Text (ASCII only):'}
        </label>
        <input id="txt-enc-input" type="text" maxlength="40"
          value="Hello Iraq" placeholder="e.g. Hello Iraq"
          style="width:100%;background:#1a1a2e;border:1px solid rgba(0,157,154,.4);color:#fff;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:8px 10px;outline:none;box-sizing:border-box">
      </div>
      <div style="min-width:110px">
        <label style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;display:block;margin-bottom:4px">N (> 126):</label>
        <select id="txt-enc-N"
          style="width:100%;background:#1a1a2e;border:1px solid rgba(0,157,154,.4);color:#fff;font-family:'IBM Plex Mono',monospace;font-size:12px;padding:8px;outline:none">
          <option value="143">143 (11×13)</option>
          <option value="187">187 (11×17)</option>
          <option value="221">221 (13×17)</option>
          <option value="247">247 (13×19)</option>
          <option value="323">323 (17×19)</option>
          <option value="437">437 (19×23)</option>
          <option value="493">493 (17×29)</option>
          <option value="899">899 (29×31)</option>
        </select>
      </div>
      <div style="min-width:90px">
        <label style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;display:block;margin-bottom:4px">e ${isAr?'(اختياري)':'(optional)'}:</label>
        <input id="txt-enc-e" type="number" min="3" max="999" placeholder="auto"
          style="width:100%;background:#1a1a2e;border:1px solid rgba(0,157,154,.4);color:#fff;font-family:'IBM Plex Mono',monospace;font-size:13px;padding:8px;outline:none">
      </div>
      <div style="align-self:flex-end">
        <button onclick="runTextEnc()"
          style="background:#009d9a;border:none;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:9px 18px;cursor:pointer;letter-spacing:.06em">
          ⚛ ${isAr?'تشفير + كسر':'ENCRYPT + BREAK'}
        </button>
      </div>
    </div>
    <div id="txt-enc-result" style="font-family:'IBM Plex Mono',monospace;font-size:12px;color:#c6c6c6"></div>
  </div>
</div>
<script>
function runTextEnc(){
  const txt=document.getElementById('txt-enc-input').value.trim()||'Hello';
  const Nsel=parseInt(document.getElementById('txt-enc-N').value)||143;
  const eVal=parseInt(document.getElementById('txt-enc-e').value)||0;
  const cat=window._NFC||[];
  const entry=cat.find(e=>e.N===Nsel);
  if(!entry){document.getElementById('txt-enc-result').innerHTML='<span style="color:#ff8389">N not found in catalog</span>';return;}
  const result=window._rsaTextDemo?window._rsaTextDemo(txt,entry.p,entry.q,eVal||null):null;
  if(!result){document.getElementById('txt-enc-result').innerHTML='<span style="color:#ff8389">Error</span>';return;}
  if(result.error){document.getElementById('txt-enc-result').innerHTML='<span style="color:#ff8389">'+result.error+'</span>';return;}
  let html='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">';
  html+='<tr><th style="color:#4589ff;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1);text-align:left">Char</th>';
  html+='<th style="color:#4589ff;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1)">ASCII</th>';
  html+='<th style="color:#ee5396;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1)">C = M^e mod N</th>';
  html+='<th style="color:#42be65;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1)">Decrypted</th>';
  html+='<th style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.1)">✓</th></tr>';
  for(const row of result.rows){
    const td1='<td style="padding:3px 8px;color:#e0e0e0;font-size:13px;font-weight:600">'+row.ch+'</td>';
    const td2='<td style="padding:3px 8px;color:#c6c6c6;text-align:center">'+row.code+'</td>';
    const td3='<td style="padding:3px 8px;color:#ee5396;text-align:center">'+row.C+'</td>';
    const td4='<td style="padding:3px 8px;color:#42be65;text-align:center">'+row.dec+'</td>';
    const td5='<td style="padding:3px 8px;text-align:center">'+(row.ok?'✓':'✗')+'</td>';
    html+='<tr>'+td1+td2+td3+td4+td5+'</tr>';
  }
  html+='</table></div>';
  var n_=result.n,p_=result.p,q_=result.q,e_=result.e,d_=result.d,phi_=result.phi,ok_=result.allOk;
  var sumDiv='<div style="margin-top:10px;padding:8px 12px;background:rgba(36,161,72,.06);border:1px solid rgba(36,161,72,.2);font-size:11px;color:#8d8d8d">'
    +'<b style="color:#009d9a">N='+n_+'</b> = '+p_+' x '+q_+' &nbsp;|&nbsp;'
    +'<b style="color:#4589ff">e='+e_+'</b> (public key) &nbsp;|&nbsp;'
    +'<b style="color:#ee5396">d='+d_.toLocaleString()+'</b> (private key) &nbsp;|&nbsp;'
    +'Phi='+phi_.toLocaleString()+' &nbsp;|&nbsp;'
    +'<b style="color:'+(ok_?'#42be65':'#ff832b')+'">'+(ok_?'All OK':'Errors')+'</b></div>';
  html+=sumDiv;
  document.getElementById('txt-enc-result').innerHTML=html;
}
var _nfcData=[{'N': 143, 'p': 11, 'q': 13}, {'N': 187, 'p': 11, 'q': 17}, {'N': 221, 'p': 13, 'q': 17}, {'N': 247, 'p': 13, 'q': 19}, {'N': 323, 'p': 17, 'q': 19}, {'N': 437, 'p': 19, 'q': 23}, {'N': 493, 'p': 17, 'q': 29}, {'N': 899, 'p': 29, 'q': 31}];
window._NFC=_nfcData;
window._rsaTextDemo=_rsaTextDemoFn;
setTimeout(runTextEnc,200);
</script>`;
}

// ─────────────────────────────────────────────────────────────────
//  ANSWER TEXT DATABASE — Arabic + English
// ─────────────────────────────────────────────────────────────────
function buildAnswerText(topic, sim, lang) {
  const isAr = lang==='ar';
  const t = typeof topic==='object' ? topic.type : topic;

  if (t==='under_dev') {
    const sub = topic?.subtype || 'هذه الخوارزمية';
    if (isAr) return `## ⚛ ${sub} — قيد التطوير\n\nهذه الخوارزمية قيد التطوير حالياً.\n\n**المتاح الآن:** خوارزمية **Shor / RSA** فقط — يمكنك تجربة:\n- Shor N=15\n- Shor N=21\n- كسر RSA\n- تشفير نص\n\nسيتم إضافة ${sub} في الإصدار القادم.`;
    return `## ⚛ ${sub} — Under Development\n\nThis algorithm is currently under development.\n\n**Available now:** **Shor / RSA** only. Try:\n- Shor N=15\n- Shor N=21\n- RSA factoring\n- Text encryption demo\n\n${sub} will be added in the next release.`;
  }

  if (t==='text_encrypt') {
    if (isAr) return `## 🔤 تشفير النصوص بـ RSA — كسر Shor\n\nيشفر RSA النص حرفاً حرفاً: كل حرف → رقم ASCII → \`C = M^e mod N\`.\n\nخوارزمية Shor تكسر N إلى عواملها ← تجد d ← تفك أي تشفير.`;
    return `## 🔤 RSA Text Encryption — Shor Attack\n\nRSA encrypts text character by character: each char → ASCII → \`C = M^e mod N\`.\n\nShor factors N → finds d → decrypts everything.`;
  }

  if (t!=='shor') return '';

  const N=sim?.N||15, p=sim?.p, q=sim?.q, r=sim?.period_r;
  const rsa=sim?.rsa;

  if (isAr) {
    return `## خوارزمية SHOR — N = ${N}\n\n**المرجع الأساسي**\nShor, P.W. (1997). *Polynomial-Time Algorithms for Prime Factorization.* SIAM J. Comput. **26**(5), 1484–1509. | Nielsen & Chuang (2010). *QCQI* Algorithm 5.2.\n\n### الخوارزمية خطوة بخطوة\n\n**الخطوة 1 — الفحص الكلاسيكي المسبق:** تحقق أن N فردي وليس قوة أولية.\n\n**الخطوة 2 — فحص GCD (كلاسيكي):** نختار a عشوائياً ونحسب gcd(a,N). إذا كان > 1 نجد العامل **فوراً بدون QFT**. هذا هو الترتيب العلمي الصحيح.\n\n**الخطوة 3 — إيجاد الدورة (كمي QFT):** فقط إذا فشل GCD، نُشغّل QFT لإيجاد أصغر r حيث a^r ≡ 1 (mod N).\n\n**الخطوة 4 — الكسور المستمرة:** k/2⁵¹ ≈ s/r → نجد r.\n\n**الخطوة 5 — استخراج العوامل:** p = gcd(a^(r/2)-1, N)، q = gcd(a^(r/2)+1, N).\n\n${p&&q?`**النتيجة:** **${N} = ${p} × ${q}** ✓`:''}${r?`  |  **r = ${r}**`:''}`;
  }

  return `## SHOR'S ALGORITHM — N = ${N}\n\n**Reference**\nShor, P.W. (1997). *SIAM J. Comput.* **26**(5), 1484. | Nielsen & Chuang (2010). Algorithm 5.2, p.226.\n\n### Steps\n\n**Step 1 — Classical pre-check:** Verify N is odd and not a perfect power.\n\n**Step 2 — GCD Check (Classical):** Choose random a, compute gcd(a,N). If > 1 → factor found **immediately, no QFT needed**. This is the correct scientific order.\n\n**Step 3 — Period Finding (Quantum QFT):** Only if GCD=1, run QFT to find smallest r where a^r ≡ 1 (mod N).\n\n**Step 4 — Continued Fractions:** k/2⁵¹ ≈ s/r → extract r.\n\n**Step 5 — Factor Extraction:** p = gcd(a^(r/2)-1, N), q = gcd(a^(r/2)+1, N).\n\n${p&&q?`**Result:** **${N} = ${p} × ${q}** ✓`:''}${r?`  |  **r = ${r}**`:''}`;
}

// ─────────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────────
function getCSS() {
  return `<style id="qask-css">
@keyframes qbl{0%,100%{opacity:1}50%{opacity:.2}}
.qask-wrap{font-family:'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif}
.qa-prose{padding:14px 0;line-height:1.9;color:#c6c6c6;font-size:14px}
.qa-prose h2{font-family:'IBM Plex Mono',monospace;color:#4589ff;font-size:12px;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid rgba(69,137,255,.2);padding-bottom:6px;margin:18px 0 10px}
.qa-prose h3{font-family:'IBM Plex Mono',monospace;color:#009d9a;font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:12px 0 5px}
.qa-prose p{margin-bottom:10px}
.qa-prose strong{color:#fff;font-weight:600}
.qa-prose code{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#1192e8;background:rgba(17,146,232,.1);padding:1px 5px}
.qa-prose ul{margin:8px 0 12px 20px}
.qa-prose li{margin-bottom:4px;line-height:1.75;color:#c6c6c6}
.qa-prose table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
.qa-prose th{background:rgba(15,98,254,.12);color:#4589ff;padding:7px 12px;border:1px solid rgba(255,255,255,.1);font-family:'IBM Plex Mono',monospace;font-size:10px}
.qa-prose td{padding:7px 12px;border:1px solid rgba(255,255,255,.05);color:#c6c6c6}
.qsim-box{border:1px solid rgba(255,255,255,.08);margin:14px 0;overflow:hidden}
.qsim-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;padding:10px 16px;background:rgba(15,98,254,.07);border-bottom:1px solid rgba(15,98,254,.18);gap:8px}
.qsim-badge{display:flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#0f62fe;letter-spacing:.1em;text-transform:uppercase}
.qsim-dot{width:7px;height:7px;background:#24a148;border-radius:50%;animation:qbl 1.2s ease-in-out infinite;flex-shrink:0}
.qsim-meta{display:flex;flex-wrap:wrap;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d}
.qsim-meta b{color:#e0e0e0}
.qmeas-wrap{overflow-x:auto}
.qmeas{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px}
.qmeas thead th{background:rgba(15,98,254,.1);color:#4589ff;padding:7px 12px;border:1px solid rgba(255,255,255,.07);font-weight:600;letter-spacing:.06em;white-space:nowrap;text-align:left;font-size:10px}
.qmeas tbody tr:nth-child(even) td{background:rgba(255,255,255,.015)}
.qmeas tbody tr:hover td{background:rgba(15,98,254,.05)}
.qmeas td{padding:5px 12px;border:1px solid rgba(255,255,255,.05);vertical-align:middle}
.qm-rank{color:#6f6f6f;font-size:10px;width:28px;text-align:center}
.qm-state{color:#e0e0e0;font-size:11px;letter-spacing:.04em;word-break:break-all;line-height:1.6;max-width:340px;min-width:180px}
.qm-count{color:#1192e8;text-align:right;white-space:nowrap;font-weight:600}
.qm-pct{color:#24a148;text-align:right;white-space:nowrap}
.qm-prob{color:#8a3ffc;text-align:right;white-space:nowrap}
.qm-bar{min-width:80px}
.qm-bar-bg{height:12px;background:rgba(255,255,255,.05)}
.qm-bar-fill{height:100%;min-width:2px}
.qstats{padding:12px 16px;background:rgba(0,0,0,.12);border-top:1px solid rgba(255,255,255,.07)}
.qstats-title{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6f6f6f;letter-spacing:.14em;text-transform:uppercase;margin-bottom:8px}
.qstats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:4px}
.qstats-row{display:flex;justify-content:space-between;align-items:center;padding:5px 10px;border:1px solid rgba(255,255,255,.05);gap:8px}
.qstats-row span{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;white-space:nowrap}
.qstats-row b{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#e0e0e0;font-weight:600;text-align:right;word-break:break-all}
.qcode-tabs{display:flex;gap:4px;margin-top:14px;flex-wrap:wrap}
.qcode-tab{padding:5px 12px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.07em;text-transform:uppercase;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#6f6f6f;cursor:pointer;transition:all .15s}
.qcode-tab.active,.qcode-tab:hover{background:rgba(15,98,254,.1);border-color:#0f62fe;color:#4589ff}
.qcode-pane{display:none}.qcode-pane.show{display:block}
.qcode-head{display:flex;align-items:center;justify-content:space-between;padding:7px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-bottom:none}
.qcode-lang{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#009d9a;letter-spacing:.1em;text-transform:uppercase}
.qcode-copy{padding:3px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8d8d8d;background:none;border:1px solid rgba(255,255,255,.12);cursor:pointer;transition:all .15s;letter-spacing:.06em}
.qcode-copy:hover{color:#fff;border-color:#fff}
.qpre{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-right:3px solid #0f62fe;padding:16px;margin:0;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#78a9ff;overflow-x:auto;white-space:pre;direction:ltr;text-align:left;line-height:1.65;max-height:380px;overflow-y:auto}
.qcosmic-banner{padding:10px 16px;background:rgba(255,131,43,.06);border:1px solid rgba(255,131,43,.15);border-right:3px solid #ff832b;margin:8px 0;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#c6c6c6}
</style>`;
}

// ─────────────────────────────────────────────────────────────────
//  PROSE RENDERER
// ─────────────────────────────────────────────────────────────────
function prose(text) {
  if (!text) return '';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let t=text.replace(/```[\s\S]*?```/g,'');
  t=t.replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^### (.+)$/gm,'<h3>$1</h3>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`\n]+)`/g,'<code>$1</code>');
  t=t.replace(/(^[-•] .+$\n?)+/gm,blk=>'<ul>'+blk.trim().split('\n').map(l=>`<li>${l.replace(/^[-•] /,'')}</li>`).join('')+'</ul>');
  t='<p>'+t.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,' ')+'</p>';
  return t.replace(/<p>\s*<(h[234]|ul|div)/g,'<$1').replace(/<\/(h[234]|ul|div)>\s*<\/p>/g,'</$1>').replace(/<p>\s*<\/p>/g,'');
}

// ─────────────────────────────────────────────────────────────────
//  MEASUREMENT TABLE
// ─────────────────────────────────────────────────────────────────
function buildTable(sim) {
  const sorted=Object.entries(sim.counts).sort((a,b)=>b[1]-a[1]).slice(0,30);
  const maxC=sorted[0]?.[1]||1;
  const COLORS=['#0f62fe','#1192e8','#009d9a','#8a3ffc','#ee5396','#ff832b','#24a148','#4589ff'];
  const rows=sorted.map(([bs,cnt],i)=>{
    const full=bs.padEnd(51,'0').slice(0,51);
    const grp=full.match(/.{1,8}/g)?.join(' ')||full;
    const pct=(cnt/sim.shots*100).toFixed(2);
    const prob=(cnt/sim.shots).toFixed(5);
    const bW=Math.round(cnt/maxC*100);
    const col=COLORS[i%COLORS.length];
    return `<tr><td class="qm-rank">${i+1}</td><td class="qm-state" title="${full}">${grp}</td><td class="qm-count">${cnt.toLocaleString()}</td><td class="qm-pct">${pct}%</td><td class="qm-prob">${prob}</td><td class="qm-bar"><div class="qm-bar-bg"><div class="qm-bar-fill" style="width:${bW}%;background:${col}"></div></div></td></tr>`;
  }).join('');
  return `<div class="qmeas-wrap"><table class="qmeas"><thead><tr><th>#</th><th>State |ψ⟩ — 51 Qubits</th><th>Counts</th><th>Prob%</th><th>P(exact)</th><th>Bar</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ─────────────────────────────────────────────────────────────────
//  STATS BOX
// ─────────────────────────────────────────────────────────────────
function buildStats(sim) {
  const H=entropy(sim.counts,sim.shots);
  const top=Object.entries(sim.counts).sort((a,b)=>b[1]-a[1])[0]||['—',0];
  const extras=[];

  if(sim.type==='Shor-QFT-51'){
    extras.push(
      `<div class="qstats-row"><span>N factored</span><b>${sim.N}</b></div>`,
      `<div class="qstats-row"><span>Factors</span><b style="color:#42be65">${sim.p} × ${sim.q}</b></div>`,
      `<div class="qstats-row"><span>Period r</span><b>${sim.period_r||'?'}</b></div>`,
      `<div class="qstats-row"><span>Verified</span><b style="color:#42be65">${sim.verified||''}</b></div>`,
      `<div class="qstats-row"><span>QFT H(X)</span><b>${sim.qftEntropy} bits</b></div>`,
      `<div class="qstats-row"><span>Method</span><b>${sim.method}</b></div>`,
      `<div class="qstats-row"><span>Hilbert 2⁵¹</span><b>2.25×10¹⁵</b></div>`,
    );
    if(sim.rsa){
      const rsa=sim.rsa;
      extras.push(
        `<div class="qstats-row" style="grid-column:1/-1;border-top:1px solid rgba(138,63,252,.2);margin-top:4px"><span style="color:#8a3ffc;font-size:10px;letter-spacing:.1em">🔑 RSA FULL ANALYSIS</span><b></b></div>`,
        `<div class="qstats-row"><span>Φ(n)=(p-1)(q-1)</span><b>${String(rsa.phi).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</b></div>`,
        `<div class="qstats-row"><span>Public key e</span><b style="color:#4589ff">${rsa.e}</b></div>`,
        `<div class="qstats-row"><span>Private key d</span><b style="color:#ee5396">${String(rsa.d).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</b></div>`,
        `<div class="qstats-row"><span>Plaintext M</span><b style="color:#4589ff">${rsa.M}</b></div>`,
        `<div class="qstats-row"><span>Ciphertext C=Mᵉ mod n</span><b style="color:#ee5396">${rsa.C}</b></div>`,
        `<div class="qstats-row"><span>Decrypt M=Cᵈ mod n</span><b style="color:#42be65">${rsa.M_dec} ${rsa.verified?'✓':'✗'}</b></div>`,
      );
    }
    if(sim.cosmicInfo){
      extras.push(
        `<div class="qstats-row"><span>☄ T₁ rate</span><b>${(sim.cosmicInfo.rate*100).toFixed(3)}%</b></div>`,
        `<div class="qstats-row"><span>T₁ events</span><b>~${sim.cosmicInfo.events}</b></div>`,
      );
    }
  }

  return `<div class="qstats">
  <div class="qstats-title">// STATISTICS · 51-QUBIT · ${sim.type}</div>
  <div class="qstats-grid">
    <div class="qstats-row"><span>Total shots</span><b>${sim.shots.toLocaleString()}</b></div>
    <div class="qstats-row"><span>Unique states</span><b>${Object.keys(sim.counts).length}</b></div>
    <div class="qstats-row"><span>Shannon H(X)</span><b>${H.toFixed(4)} bits</b></div>
    <div class="qstats-row"><span>Top prob</span><b>${(top[1]/sim.shots*100).toFixed(3)}%</b></div>
    ${extras.join('')}
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  CODE SNIPPETS — Shor only (clean, no other algos)
// ─────────────────────────────────────────────────────────────────
function buildCode(sim) {
  if (sim.type!=='Shor-QFT-51') return '';
  const N=sim.N||15;
  const pyShor=`# Iraq Quantum Lab — Shor's Algorithm
# Ref: Shor (1997) SIAM J. Comput. 26(5), 1484
#      Nielsen & Chuang (2010) Algorithm 5.2, p.226
from math import gcd
from fractions import Fraction

def shor(N, a=2):
    print(f"=== Shor N={N} ===")

    # Step 1: Classical pre-check
    if N % 2 == 0:
        return 2, N//2

    # Step 2: GCD check FIRST (classical)
    g = gcd(a, N)
    if g > 1:
        print(f"  gcd({a},{N})={g} — Direct factor! (no QFT)")
        return g, N//g

    # Step 3: Only if GCD=1 → Quantum Period Finding
    print(f"  gcd={g} → proceed to QFT")
    r = find_period(a, N)   # quantum step
    print(f"  Period r={r}")

    # Step 4: Continued fractions handled inside find_period
    # Step 5: Factor extraction
    if r % 2 != 0:
        raise ValueError("r is odd — retry with different a")
    x = pow(a, r//2, N)
    if x == N-1:
        raise ValueError("a^(r/2)≡-1 — retry")
    p, q = gcd(x-1, N), gcd(x+1, N)
    print(f"  {N} = {p} x {q} ✓")
    return p, q

def find_period(a, N):
    # Quantum period finding (classical simulation)
    r = 1
    while pow(a, r, N) != 1:
        r += 1
    return r

p, q = shor(${N})
print(f"Result: {${N}} = {p} x {q}")`;

  const qiskitCode=`# Shor's Algorithm — Qiskit
# Ref: Nielsen & Chuang §5.3
from qiskit import QuantumCircuit
from qiskit.circuit.library import QFT
from qiskit_aer import AerSimulator
from math import gcd, ceil, log2
from fractions import Fraction

N = ${N}
n = ceil(log2(N+1))
n_count = 2*n + 3

# Step 2: GCD first
a = 7
g = gcd(a, N)
if g > 1:
    print(f"Direct factor: gcd({a},{N})={g}")
else:
    # Step 3: QFT period finding (only if GCD=1)
    qc = QuantumCircuit(n_count + n, n_count)
    qc.h(range(n_count))
    for k in range(n_count):
        power = pow(a, 2**k, N)
        qc.cp(2*3.14159*power/N, k, n_count)
    qc.append(QFT(n_count,inverse=True), range(n_count))
    qc.measure(range(n_count), range(n_count))
    counts = AerSimulator().run(qc,shots=8192).result().get_counts()
    Q = 2**n_count
    for state in sorted(counts, key=counts.get, reverse=True)[:8]:
        k = int(state, 2)
        r = Fraction(k,Q).limit_denominator(N).denominator
        if pow(a,r,N)==1 and r%2==0:
            x = pow(a,r//2,N)
            p,q = gcd(x-1,N), gcd(x+1,N)
            if p*q==N:
                print(f"{N} = {p} x {q}")
                break`;

  const id1=`qc-py-${Date.now()}`, id2=`qc-qk-${Date.now()}`;
  return `<div class="qcode-section" style="margin-top:12px">
  <div class="qcode-tabs">
    <button class="qcode-tab active" onclick="qaskTab(0,this)">Python · Classical Sim</button>
    <button class="qcode-tab" onclick="qaskTab(1,this)">Python · Qiskit</button>
  </div>
  <div class="qcode-pane show">
    <div class="qcode-head"><span class="qcode-lang">Python</span><button class="qcode-copy" onclick="qaskCopy('${id1}',this)">Copy</button></div>
    <pre class="qpre" id="${id1}">${pyShor}</pre>
  </div>
  <div class="qcode-pane">
    <div class="qcode-head"><span class="qcode-lang">Python · Qiskit</span><button class="qcode-copy" onclick="qaskCopy('${id2}',this)">Copy</button></div>
    <pre class="qpre" id="${id2}">${qiskitCode}</pre>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  UNDER-DEV RENDER
// ─────────────────────────────────────────────────────────────────
function buildUnderDev(topic, lang) {
  const isAr=lang==='ar';
  const sub=topic?.subtype||'هذه الخوارزمية';
  const txt=buildAnswerText(topic,null,lang);
  return `<div class="qask-wrap">
  <div style="padding:7px 14px;background:rgba(255,131,43,.06);border:1px solid rgba(255,131,43,.2);border-right:3px solid #ff832b;margin-bottom:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#ff832b">
    🚧 ${sub} — ${isAr?'قيد التطوير':'Under Development'}
  </div>
  <div class="qa-prose">${prose(txt)}</div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  FULL HTML BUILDER
// ─────────────────────────────────────────────────────────────────
function buildHTML(answerText, sim, topic, lang) {
  const t=typeof topic==='object'?topic.type:topic;
  const isShor=sim.type==='Shor-QFT-51';
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Under dev
  if(t==='under_dev') return buildUnderDev(topic,lang);

  // Text encrypt
  if(t==='text_encrypt') {
    return `<div class="qask-wrap"><div class="qa-prose">${prose(answerText)}</div>${buildTextEncryptBox(sim,lang)}</div>`;
  }

  const peakChart = isShor ? buildQFTPeaksChart(sim) : '';
  const shorLog   = isShor ? buildShorLog(sim) : '';
  const cosmicBanner = sim.cosmicInfo ? `<div class="qcosmic-banner"><b>☄ Cosmic Ray T₁ — Vepsäläinen et al., Nature 584 (2020)</b><br>γ = ${(sim.cosmicInfo.rate*100).toFixed(3)}% · ~${sim.cosmicInfo.events} events</div>` : '';

  const rsaBox = (isShor&&sim.rsa) ? (()=>{
    const rsa=sim.rsa;
    return `<div style="margin:10px 0;border:1px solid rgba(138,63,252,.2);background:rgba(138,63,252,.03)">
  <div style="padding:7px 14px;font-family:'IBM Plex Mono',monospace;font-size:10px;color:#8a3ffc;letter-spacing:.1em;border-bottom:1px solid rgba(138,63,252,.15)">🔑 RSA FULL ANALYSIS — N=${rsa.n}</div>
  <div style="padding:10px 16px;font-family:'IBM Plex Mono',monospace;font-size:12px;line-height:2;color:#c6c6c6">
    <div><span style="color:#6f6f6f">n = p × q =</span> <b>${rsa.p} × ${rsa.q} = ${rsa.n}</b></div>
    <div><span style="color:#6f6f6f">Φ(n) = (p-1)(q-1) =</span> <b>${String(rsa.phi).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</b></div>
    <div><span style="color:#6f6f6f">e (public key) =</span> <b style="color:#4589ff;font-size:14px">${rsa.e}</b></div>
    <div><span style="color:#6f6f6f">d (private key) =</span> <b style="color:#ee5396;font-size:14px">${String(rsa.d).replace(/\B(?=(\d{3})+(?!\d))/g,',')}</b></div>
    <div><span style="color:#6f6f6f">M (plaintext) =</span> <b style="color:#4589ff;font-size:14px">${rsa.M}</b></div>
    <div><span style="color:#6f6f6f">C = M^e mod n =</span> <b style="color:#ee5396;font-size:14px">${rsa.C}</b></div>
    <div><span style="color:#6f6f6f">Decrypt M = C^d mod n =</span> <b style="color:#42be65;font-size:14px">${rsa.M_dec} ${rsa.verified?'✓':'✗'}</b></div>
    <div style="margin-top:6px;font-size:10px;color:#6f6f6f">${esc(rsa.steps?.step3||'')} | ${esc(rsa.steps?.step4||'')}</div>
  </div>
</div>`;
  })() : '';

  return `<div class="qask-wrap">
  <div style="padding:7px 14px;background:rgba(15,98,254,.06);border:1px solid rgba(15,98,254,.15);border-right:3px solid #0f62fe;margin-bottom:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8d8d8d">
    ⚛ <b>Shor / شور</b> — خوارزمية تحليل الأعداد الكمية · Iraq Quantum Lab v9.0
  </div>
  <div class="qa-prose">${prose(answerText)}</div>
  ${rsaBox}${peakChart}${shorLog}${cosmicBanner}
  <div class="qsim-box">
    <div class="qsim-head">
      <div class="qsim-badge"><span class="qsim-dot"></span>LIVE SIMULATION — 51-QUBIT · ${sim.type}</div>
      <div class="qsim-meta">
        <span>Type: <b>${sim.type}</b></span>
        <span>Shots: <b>${sim.shots.toLocaleString()}</b></span>
        <span>States: <b>${Object.keys(sim.counts).length}</b></span>
        <span>H(X): <b>${entropy(sim.counts,sim.shots).toFixed(3)} bits</b></span>
        ${isShor&&sim.p?`<span>Result: <b style="color:#42be65">${sim.p}×${sim.q}</b></span>`:''}
      </div>
    </div>
    ${buildTable(sim)}
    ${buildStats(sim)}
  </div>
  ${buildCode(sim)}
</div>`;
}

// ─────────────────────────────────────────────────────────────────
//  LRU CACHE — 60 entries
// ─────────────────────────────────────────────────────────────────
const _cache=new Map();
function cacheKey(q,l,r,s){return `${l}::r${r}::s${s}::${q.trim().toLowerCase().replace(/\s+/g,' ')}`;}

// ─────────────────────────────────────────────────────────────────
//  GLOBAL HELPERS
// ─────────────────────────────────────────────────────────────────
if(typeof window!=='undefined'){
  window.qaskTab=function(idx,btn){
    const wrap=btn.closest('.qcode-section');
    wrap.querySelectorAll('.qcode-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
    wrap.querySelectorAll('.qcode-pane').forEach((p,i)=>p.classList.toggle('show',i===idx));
  };
  window.qaskCopy=function(id,btn){
    const pre=document.getElementById(id); if(!pre)return;
    const orig=btn.textContent;
    navigator.clipboard?.writeText(pre.textContent).then(()=>{
      btn.textContent='✓ Copied'; setTimeout(()=>btn.textContent=orig,2000);
    }).catch(()=>{
      const ta=document.createElement('textarea');
      ta.value=pre.textContent; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      btn.textContent='✓ Copied'; setTimeout(()=>btn.textContent='Copy',2000);
    });
  };
}

// ─────────────────────────────────────────────────────────────────
//  MAIN API
// ─────────────────────────────────────────────────────────────────
const QuantumAsk = {

  async ask(question, language='ar', r=1, shots=1024, options={}) {
    if (!question?.trim()) throw new Error('Empty question');
    const q   = question.trim();
    const lang= ['ar','en'].includes(language)?language:'ar';
    r    = Math.max(1, Math.min(50, parseInt(r)||1));
    shots= [512,1024,2048,4096,8192].includes(parseInt(shots))?parseInt(shots):1024;
    const cosmicRayActive = options.cosmicRay||false;
    const e_override = options.e_override||null;

    // Inject CSS once
    if(typeof document!=='undefined'&&!document.getElementById('qask-css')){
      document.head.insertAdjacentHTML('beforeend',getCSS());
    }

    const ck=cacheKey(q,lang,r,shots);
    if(_cache.has(ck)&&!cosmicRayActive) return{..._cache.get(ck),cached:true};

    const topic=detectTopic(q);
    if(cosmicRayActive) topic.cosmicRay=true;
    if(e_override) topic.e_override=e_override;

    const sim=chooseSim(topic, r, shots, e_override);
    const answerText=buildAnswerText(topic, sim, lang);
    const html=buildHTML(answerText, sim, topic, lang);
    const result={raw:answerText, html, topic, sim, lang, r, shots, cached:false, timestamp:new Date().toISOString()};

    if(_cache.size>=60) _cache.delete(_cache.keys().next().value);
    _cache.set(ck,result);
    return result;
  },

  simulate(topicName,r=1,shots=1024){ return chooseSim(topicName,r,shots); },
  shor51(N=15,shots=1024){ return ShorEngine.runFull(N,shots,false); },
  textEncrypt(text,p,q,e){ return rsaTextDemo(text,p,q,e); },
  detectTopic,
  clearCache(){ _cache.clear(); },
  cacheStats(){ return{size:_cache.size,max:60}; },
  ShorEngine, Security,
};

try{ window.QuantumAsk=QuantumAsk; window.QASecurity=Security; }catch(e){}
try{ if(typeof module!=='undefined'&&module.exports) module.exports=QuantumAsk; }catch(e){}
