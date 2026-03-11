// api/index.js - جميع الـ API في ملف واحد
export default async function handler(req, res) {
  // CORS Headers
  const allowedOrigins = [
    'https://iraq-git-main-omerbets-projects.vercel.app',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // استخراج المسار
  const path = req.url.split('?')[0];

  try {
    // ═══════════════════════════════════════════
    // 1️⃣ AUTH ROUTES - التوثيق
    // ═══════════════════════════════════════════
    if (path === '/api/auth' || path === '/api/index/auth') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const { action, email, password, otp } = req.body;

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
            body: JSON.stringify({ email, password })
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
    }

    // ═══════════════════════════════════════════
    // 2️⃣ CLAUDE AI ROUTES - الذكاء الاصطناعي
    // ═══════════════════════════════════════════
    if (path === '/api/claude' || path === '/api/index/claude') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

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

      // Rate limiting بسيط
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
    }

    // ═══════════════════════════════════════════
    // 3️⃣ ADMIN ROUTES - الإدارة
    // ═══════════════════════════════════════════
    if (path === '/api/admin' || path === '/api/index/admin') {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);

      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      // التحقق من المستخدم
      const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });

      if (!userResponse.ok) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const user = await userResponse.json();
      
      // التحقق من صلاحية المسؤول
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');
      
      if (!ADMIN_EMAILS.includes(user.email)) {
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
      }

      // جلب المستخدمين
      const usersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=50`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });

      const usersData = await usersResponse.json();

      if (!usersResponse.ok) {
        return res.status(usersResponse.status).json(usersData);
      }

      const users = usersData.users || [];
      const today = new Date().toISOString().split('T')[0];

      const stats = {
        total: users.length,
        today: users.filter(u => u.created_at?.startsWith(today)).length,
        active: users.filter(u => u.last_sign_in_at?.startsWith(today)).length,
        recent: users
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)
          .map(u => ({
            email: u.email,
            created_at: u.created_at,
            last_sign_in: u.last_sign_in_at
          }))
      };

      return res.status(200).json(stats);
    }

    // ═══════════════════════════════════════════
    // 4️⃣ 404 - Route not found
    // ═══════════════════════════════════════════
    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
