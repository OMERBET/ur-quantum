// api/admin.js - Serverless Function محمي للإدارة
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // التحقق من صلاحية المسؤول
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // مفتاح خدمة محمي

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // التحقق من أن المستخدم مسؤول
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
    
    // التحقق من الإيميل المسؤول (يمكن استخدام roles بدلاً من ذلك)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',');
    
    if (!ADMIN_EMAILS.includes(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // جلب بيانات المستخدمين
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

    // معالجة البيانات
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

  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
