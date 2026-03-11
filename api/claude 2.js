// api/claude.js - Serverless Function لحماية Anthropic API
export default async function handler(req, res) {
  // إعدادات CORS
  const allowedOrigins = [
    'https://your-domain.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // التحقق من التوثيق (يمكن إضافة JWT verification)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Rate limiting بسيط - يمكن تحسينه
    const MAX_MESSAGE_LENGTH = 4000;
    const totalLength = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    
    if (totalLength > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: `أنت مساعد حوسبة كمية متخصص. تجيب بالعربية وبتفاصيل علمية دقيقة.
- اشرح المفاهيم الكمية بوضوح
- أضف أمثلة Python بمكتبات: qiskit, cirq, pennylane
- وضّح التطبيقات العملية`,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({ 
        error: 'API request failed',
        details: data 
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Claude API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
