// ═══════════════════════════════════════
//   Iraq Quantum Lab — middleware.js
//   NOTE: موقع 100% static — لا يحتاج API
//   هذا الملف placeholder فقط لتجنب أخطاء Vercel
// ═══════════════════════════════════════

// All security is handled client-side in ask.js
// No server-side processing needed

module.exports = {
  checkRate: function(ip) { return true; },
  sanitize: function(str) { return typeof str === 'string' ? str.slice(0,500) : ''; },
  isMalicious: function(str) { return false; },
  secureHeaders: function(res) {
    if (res && res.setHeader) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
    }
  }
};
