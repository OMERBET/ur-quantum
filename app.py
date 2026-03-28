
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import json, traceback

# ── استيراد خوارزمية Shor الحقيقية ──
from shor_core import shor_algorithm, get_noise_level, IBM_EAGLE_51Q

app = FastAPI(title="Iraq Quantum Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Models
# ─────────────────────────────────────────────

class CodeRequest(BaseModel):
    code: str

class QueryRequest(BaseModel):
    query: str

class ShorRequest(BaseModel):
    N:         int  = 51
    shots:     int  = 1024
    use_noise: bool = True

# ─────────────────────────────────────────────
#  محاكاة كمية بـ numpy
# ─────────────────────────────────────────────

QUANTUM_PROGRAMS = {
    "bell": """
import numpy as np
shots = 1024
results = {'00': 0, '11': 0}
for _ in range(shots):
    if np.random.random() < 0.5:
        results['00'] += 1
    else:
        results['11'] += 1
print("=== Bell State — تشابك كمي ===")
print(f"النتائج: {results}")
print(f"التفسير: الكيوبتان متشابكان — إذا قست الأول يحدد الثاني تلقائياً")
""",
    "superposition": """
import numpy as np
shots = 1024
n = 3
results = {}
for _ in range(shots):
    state = ''.join(['1' if np.random.random() < 0.5 else '0' for _ in range(n)])
    results[state] = results.get(state, 0) + 1
print("=== Superposition — 3 Qubits ===")
print(f"النتائج: {dict(sorted(results.items()))}")
print(f"كل كيوبت بحالتين 0 و1 في نفس الوقت — {2**n} حالة ممكنة")
""",
    "grover": """
import numpy as np
target = '11'
shots = 1024
N = 4
probs = {'00': 0.083, '01': 0.083, '10': 0.083, '11': 0.751}
results = {s: 0 for s in probs}
for _ in range(shots):
    r = np.random.random()
    cum = 0
    for state, p in probs.items():
        cum += p
        if r < cum:
            results[state] += 1
            break
print("=== Grover Search ===")
print(f"الهدف: |{target}⟩")
print(f"النتائج: {results}")
print(f"Grover يضخم احتمالية الهدف — يجد الجواب بـ √N خطوة")
"""
}

# ─────────────────────────────────────────────
#  Endpoints الأصلية
# ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "Iraq Quantum Lab API — Running", "version": "2.0"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/run")
async def run_code(req: CodeRequest):
    """تشغيل كود Python كمي"""
    import sys
    from io import StringIO

    buf = StringIO()
    old_stdout = sys.stdout
    sys.stdout = buf
    result = {"output": "", "counts": {}, "success": True, "error": ""}

    try:
        safe_globals = {
            "__builtins__": __builtins__,
            "np": np, "numpy": np,
        }
        exec(req.code, safe_globals)
        output = buf.getvalue()
        result["output"] = output

        import re
        m = re.search(r'\{[^}]+\}', output)
        if m:
            try:
                counts = json.loads(m.group().replace("'", '"'))
                result["counts"] = counts
            except:
                pass

    except Exception as e:
        result["success"] = False
        result["error"]   = str(e)
        result["output"]  = f"خطأ: {e}\n{traceback.format_exc()}"
    finally:
        sys.stdout = old_stdout

    return result

@app.post("/ask")
async def ask_quantum(req: QueryRequest):
    """جواب على سؤال كمي مع كود"""
    query = req.query.lower()
    answers = {
        "bell": {
            "answer": "Bell State هو أبسط مثال على التشابك الكمي.",
            "code": QUANTUM_PROGRAMS["bell"],
            "result": "النتائج تظهر 50% للحالة |00⟩ و50% للحالة |11⟩"
        },
        "superposition": {
            "answer": "التراكب الكمي هو قدرة الكيوبت على التواجد في حالتين في نفس الوقت.",
            "code": QUANTUM_PROGRAMS["superposition"],
            "result": "توزيع متساوٍ على 8 حالات ممكنة"
        },
        "grover": {
            "answer": "خوارزمية Grover تجد العنصر المطلوب بـ √N خطوة.",
            "code": QUANTUM_PROGRAMS["grover"],
            "result": "الهدف |11⟩ يظهر بنسبة 75%"
        },
    }
    response = None
    for key in answers:
        if key in query:
            response = answers[key]
            break
    if not response:
        response = {
            "answer": "يمكنني شرح Bell State، Superposition، Grover، أو Shor.",
            "code": QUANTUM_PROGRAMS["bell"],
            "result": "جرّب أحد الأمثلة الجاهزة"
        }
    return response


# ─────────────────────────────────────────────
#  ★ Shor's Algorithm — الجديد والحقيقي ★
# ─────────────────────────────────────────────

@app.post("/shor")
async def run_shor(req: ShorRequest):
    """
    خوارزمية Shor الكمية الحقيقية.
    
    التطبيق:
    - QFT (Quantum Fourier Transform) حقيقية
    - Period Finding كمي عبر IQFT
    - Continued Fractions لاستخراج الدورية r
    - IBM Eagle 51Q Noise Model (اختياري)
    
    مرجع: Nielsen & Chuang (2010), Algorithm 5.2
    """
    # ── التحقق من المدخلات ──
    if req.N < 4:
        return {"success": False, "error": "N يجب أن يكون > 3"}
    if req.N > 500:
        return {"success": False, "error": "N أكبر من 500 — استخدم N ≤ 500"}
    if not (64 <= req.shots <= 8192):
        return {"success": False, "error": "shots يجب أن يكون بين 64 و 8192"}

    # ── مستوى الضوضاء ──
    noise = get_noise_level(51) if req.use_noise else 0.0

    # ── تشغيل Shor ──
    try:
        result = shor_algorithm(
            N=req.N,
            shots=req.shots,
            noise_level=noise
        )
    except Exception as e:
        return {"success": False, "error": str(e),
                "trace": traceback.format_exc()}

    # ── تنسيق النص ──
    if result["success"]:
        lines = [
            f"=== Shor's Algorithm — Iraq Quantum Lab ===",
            f"N = {req.N} = {result['p']} × {result['q']}",
        ]
        if "period_r" in result:
            lines += [
                f"الدورية r     = {result['period_r']}",
                f"a المختار     = {result['a']}",
                f"counting bits = {result.get('n_count', 'N/A')}",
                f"shots         = {result['shots']}",
                f"noise (IBM Eagle 51Q) = {result.get('noise_pct', 0)}%",
                f"الطريقة       = {result['method']}",
                f"التحقق        : {result.get('verified', '')}",
            ]
        lines += ["", "── سجل الخطوات ──"] + result.get("log", [])
        output_text = "\n".join(lines)
    else:
        output_text = "خوارزمية Shor لم تنجح — أعد المحاولة\n"
        output_text += "\n".join(result.get("log", []))

    return {
        "success":    result["success"],
        "output":     output_text,
        "p":          result.get("p"),
        "q":          result.get("q"),
        "period_r":   result.get("period_r"),
        "a":          result.get("a"),
        "n_count":    result.get("n_count"),
        "shots":      result.get("shots"),
        "noise_pct":  result.get("noise_pct"),
        "method":     result.get("method"),
        "attempts":   result.get("attempts"),
        "top_counts": result.get("top_counts", {}),
        "ibm_params": IBM_EAGLE_51Q,
        "verified":   result.get("verified"),
        "log":        result.get("log", [])
    }
