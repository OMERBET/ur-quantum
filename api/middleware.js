// ═══════════════════════════════════════
//   Iraq Quantum Lab — API Middleware
//   الاسم: middleware.js
//   المسار: api/middleware.js
// ═══════════════════════════════════════

const rateMap = new Map();

export function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > 60000) {
    rateMap.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  rateMap.set(ip, entry);
  return true;
}

export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 500);
}

export function isMalicious(str) {
  const patterns = [
    /<script/i, /javascript:/i, /eval\(/i,
    /document\./i, /window\./i, /SELECT.*FROM/i
  ];
  return patterns.some(p => p.test(str));
}

export function secureHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
}
