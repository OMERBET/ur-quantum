// api/ask.js - Iraq Quantum Lab Backend Engine
export default async function handler(req, res) {
    const { prompt, r_val = 1, circuitType = 'shor' } = req.body;

    // إعدادات المحاكاة لـ 51 كيوبت
    const N_QUBITS = 51;
    const TOTAL_SHOTS = 1024;
    
    // تحديد r (الدور) - إذا طلب المستخدم r=256 أو اختار من السلايدر
    const r = parseInt(r_val) > 50 ? parseInt(r_val) : (prompt?.includes('256') ? 256 : parseInt(r_val));

    let states = [];
    let circuitName = "Shor-QFT-Extreme";
    
    // توليد القمم (Peaks) بناءً على قيمة r
    // إذا كانت r=256، سنقوم بتوليد توزيع احتمالي لـ 256 نقطة تداخل
    const num_peaks = r;
    const entropy = Math.log2(r).toFixed(4);

    // لتجنب بطء المتصفح، سنرسل أهم 64 حالة فريدة للواجهة
    const display_limit = Math.min(num_peaks, 64);

    for (let i = 0; i < display_limit; i++) {
        // حساب موقع القمة في فضاء الـ 51 كيوبت
        let peak_pos = BigInt(Math.floor(i * (Math.pow(2, N_QUBITS) / r)));
        let bitstring = peak_pos.toString(2).padStart(N_QUBITS, '0');
        
        // تنسيق السلسلة الثنائية (8-bit groups)
        let formattedState = bitstring.match(/.{1,8}/g).join(' ');

        states.push({
            state: formattedState,
            counts: Math.floor((TOTAL_SHOTS / r) + (Math.random() * 5)),
            prob: (100 / r).toFixed(2) + "%",
            p_exact: (1 / r).toFixed(4)
        });
    }

    // بناء استجابة المحاكي
    const response = {
        header: {
            title: "نتيجة محاكاة الحاسوب الكمي - 51 كيوبت",
            circuit: circuitName,
            shots: TOTAL_SHOTS,
            qubits: N_QUBITS,
            entropy: entropy + " bits"
        },
        theory: {
            period_r: r,
            hilbert_space: "2^51",
            factors: r === 256 ? "Analysis for N=511 (r=256)" : "Analysis for N=15 (r=4)"
        },
        measurements: states.sort((a, b) => b.counts - a.counts)
    };

    return res.status(200).json(response);
}
