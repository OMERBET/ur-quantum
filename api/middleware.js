// ═══════════════════════════════════════
//   Iraq Quantum Lab — middleware.js v2.0
//   NOTE: موقع 100% static — لا يحتاج API
//   هذا الملف placeholder فقط لتجنب أخطاء Vercel
//   All security handled client-side in ask.js (QASecurity module)
// ═══════════════════════════════════════
'use strict';

const rateMap = new Map();

function checkRate(ip) {
  if (!ip) return true;
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60000) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= 30) return false;
  entry.count++;
  rateMap.set(ip, entry);
  return true;
}

function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 500);
}

function isMalicious(str) {
  if (typeof str !== 'string') return false;
  const patterns = [
    /<script/i, /javascript:/i, /eval\(/i,
    /document\./i, /window\./i, /SELECT.*FROM/i,
    /DROP\s+TABLE/i, /INSERT\s+INTO/i,
  ];
  return patterns.some(p => p.test(str));
}

function secureHeaders(res) {
  if (!res || typeof res.setHeader !== 'function') return;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

module.exports = { checkRate, sanitize, isMalicious, secureHeaders };
