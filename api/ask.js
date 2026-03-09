// v2 - GROQ API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query مطلوب' });

  const GROQ_KEY = process.env.GROQ_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'API Key غير موجود' });

  const prompt = `أنت خبير في الحوسبة الكمية. أجب بالعربية على هذا السؤال بشكل منظم:

السؤال: ${query}

اكتب إجابتك بهذا الترتيب بالضبط:
ANSWER:
(شرح واضح بالعربية، 3-5 جمل)

CODE:
(كود Python كامل يعمل مع numpy فقط — يحاكي الكيوبتات بالمصفوفات)

RESULT:
(ملاحظة مفيدة، جملة واحدة)`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500
      })
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      return res.status(groqRes.status).json({ error: err.error?.message || 'خطأ من Groq' });
    }

    const data = await groqRes.json();
    const answer = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ answer });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
