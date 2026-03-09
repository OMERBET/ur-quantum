export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query مطلوب' });

  const GEMINI_KEY = process.env.GEMINI_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'API Key غير موجود' });

  const prompt = `أنت خبير في الحوسبة الكمية. أجب بالعربية على هذا السؤال بشكل منظم:

السؤال: ${query}

اكتب إجابتك بهذا الترتيب بالضبط (استخدم هذه الكلمات كعناوين):
ANSWER:
(شرح واضح بالعربية، 3-5 جمل)

CODE:
(كود Python كامل يعمل مع numpy فقط — لا تستخدم qiskit — يحاكي الكيوبتات يدوياً بالمصفوفات)

RESULT:
(ملاحظة أو تلميح مفيد، جملة واحدة)`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      return res.status(geminiRes.status).json({ error: err.error?.message || 'خطأ من Gemini' });
    }

    const data = await geminiRes.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
