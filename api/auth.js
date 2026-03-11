// api/auth.js - Serverless Function لحماية عمليات التوثيق
export default async function handler(req, res) {
  // إعدادات CORS محمية
  const allowedOrigins = [
    'https://your-domain.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // السماح فقط بـ POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate Limiting بسيط (يمكن تحسينه مع Vercel KV)
  const userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  try {
    const { action, email, password, otp } = req.body;

    // التحقق من البيانات
    if (!action || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    let response;

    switch (action) {
      case 'signup':
        response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            email,
            password,
            options: {
              emailRedirectTo: `${req.headers.origin}/`
            }
          })
        });
        break;

      case 'signin':
        response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            email,
            password
          })
        });
        break;

      case 'verify-otp':
        response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            type: 'email',
            email,
            token: otp
          })
        });
        break;

      case 'resend-otp':
        response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY
          },
          body: JSON.stringify({
            email,
            create_user: false
          })
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
