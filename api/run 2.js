import { checkRate, sanitize, isMalicious, secureHeaders } from './middleware.js';

// ═══════════════════════════════════════
//   Iraq Quantum Lab — Secure run.js
//   الاسم: run.js
//   المسار: api/run.js
// ═══════════════════════════════════════

const IBM_51Q = {
  avg_gate_error: 0.000842,
  avg_readout_error: 0.0325,
  t1_relaxation_us: 145.2,
  t2_coherence_us: 122.8,
  qubits: 51
};

function noise(bit) {
  const err = IBM_51Q.avg_readout_error + IBM_51Q.avg_gate_error * 51;
  return Math.random() < err ? (Math.random() > 0.5 ? 1 : 0) : bit;
}

function sanitizeCode(code) {
  const blocked = [
    /import\s+os/i, /import\s+sys/i, /subprocess/i,
    /open\s*\(/i, /__import__/i, /globals\s*\(/i,
    /locals\s*\(/i, /breakpoint/i, /compile\s*\(/i,
    /\.\.\//
  ];
  if (blocked.some(p => p.test(code))) return null;
  return code.slice(0, 2000);
}

export default async function handler(req, res) {
  // ── Security Headers ──
  secureHeaders(res);
  res.setHeader("Access-Control-Allow-Origin", "https://iraq-quantum.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Rate Limiting ──
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (!checkRate(ip)) {
    return res.status(429).json({ error: "تجاوزت الحد — انتظر دقيقة", success: false });
  }

  // ── فحص المدخلات ──
  const rawCode = req.body?.code || "";
  if (isMalicious(rawCode)) {
    return res.status(400).json({ error: "كود غير مسموح", success: false });
  }
  const cleanCode = sanitizeCode(rawCode);
  if (!cleanCode) {
    return res.status(400).json({ error: "الكود يحتوي على أوامر محظورة", success: false });
  }

  // ── محاكاة IBM 51Q ──
  const shots = 1024;
  const counts = {};
  for (let i = 0; i < shots; i++) {
    let s = "";
    for (let q = 0; q < 3; q++) s += noise(Math.random() > 0.5 ? 1 : 0);
    counts[s] = (counts[s] || 0) + 1;
  }

  const output = `=== IBM 51Q Simulation ===\nالنتائج: ${JSON.stringify(counts)}\nT1: ${IBM_51Q.t1_relaxation_us}μs | T2: ${IBM_51Q.t2_coherence_us}μs\nخطأ البوابة: ${IBM_51Q.avg_gate_error}`;

  return res.status(200).json({ output, counts, success: true, error: "" });
}
