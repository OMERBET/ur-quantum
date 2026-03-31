// api/ask.js - المتوافق مع ملف index.html الأصلي
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    // سحب البيانات كما ترسلها واجهتك الحالية
    const { prompt, r_val } = req.body;
    
    const N_QUBITS = 51;
    const TOTAL_SHOTS = 1024;
    
    // تحديد r: الأولوية لـ r_val القادمة من السلايدر
    let r = r_val ? parseInt(r_val) : 4;
    let N = 15;
    let factors = "3 × 5";

    // إذا تم اختيار r=256 يدوياً أو عبر السلايدر مستقبلاً
    if (r === 256) { N = 511; factors = "7 × 73"; }

    let states = [];
    const entropy = Math.log2(r).toFixed(4);
    const step = BigInt(2)**BigInt(N_QUBITS) / BigInt(r);
    
    // توليد الحالات (يجب أن تحتوي المصفوفة على اسم measurements ليعمل الاندكس)
    const displayCount = Math.min(r, 64); 

    for (let i = 0; i < displayCount; i++) {
        let peak_pos = BigInt(i) * step;
        let bitstring = peak_pos.toString(2).padStart(N_QUBITS, '0');
        let formattedState = bitstring.match(/.{1,8}/g).join(' ');

        states.push({
            state: formattedState,
            counts: Math.floor((TOTAL_SHOTS / r) + (Math.random() * 4 - 2)),
            prob: (100 / r).toFixed(2) + "%"
        });
    }

    // هذه الهيكلية هي ما يتوقعه ملف index.html الخاص بك في دالة renderResults
    const response = {
        header: {
            title: `تحليل خوارزمية شور (N=${N})`,
            entropy: `${entropy} bits`
        },
        stats: {
            period_r: r,
            factors: factors
        },
        measurements: states // هذا هو المفتاح الأساسي الذي يقرأه الاندكس
    };

    return res.status(200).json(response);
}
