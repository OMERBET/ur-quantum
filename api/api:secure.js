// ════════════════════════════════════════════════════════════════════════════
// 🔒 IRAQ QUANTUM LAB - ALL-IN-ONE SECURE API
// ════════════════════════════════════════════════════════════════════════════
// 
// 📦 DEPLOYMENT:
// 1. Upload to Vercel: vercel.com
// 2. Add Environment Variables in Vercel Dashboard:
//    - SUPABASE_URL
//    - SUPABASE_KEY  
//    - ANTHROPIC_API_KEY
//    - ADMIN_EMAIL
// 3. Deploy!
//
// 🔐 SECURITY FEATURES:
// ✅ Rate Limiting (10 req/min)
// ✅ Input Sanitization (XSS/SQL protection)
// ✅ CORS Protection
// ✅ Admin Authentication
// ✅ No exposed secrets
// ✅ Security Headers
//
// 📡 ENDPOINTS:
// POST /api/secure
// Actions: signup, verify, login, chat, admin_users
//
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

// ══════════════════════════════════════════════════════════════════════════
// 🛡️ SECURITY LAYER
// ══════════════════════════════════════════════════════════════════════════

// ── Rate Limiting ──
const rateLimit = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const userLimits = rateLimit.get(ip) || { count: 0, resetTime: now + RATE_WINDOW };
  
  if (now > userLimits.resetTime) {
    userLimits.count = 0;
    userLimits.resetTime = now + RATE_WINDOW;
  }
  
  userLimits.count++;
  rateLimit.set(ip, userLimits);
  
  return userLimits.count <= RATE_LIMIT;
}

// ── Input Sanitization ──
function sanitize(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .slice(0, 1000);
}

// ── CORS Config ──
const ALLOWED_ORIGINS = [
  'https://iraq-ten.vercel.app',
  'http://localhost:3000'
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

// ══════════════════════════════════════════════════════════════════════════
// 🎯 MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  
  // Only POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Rate limiting
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ 
      error: 'Too many requests. Try again in 1 minute.' 
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const body = await req.json();
    const { action, data } = body;
    
    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    
    // ══════════════════════════════════════════════════════════════════════
    // 📍 ROUTE HANDLERS
    // ══════════════════════════════════════════════════════════════════════
    
    switch (action) {
      
      // ──────────────────────────────────────────────────────────────────
      // 🔐 AUTH: Sign Up with OTP
      // ──────────────────────────────────────────────────────────────────
      case 'signup': {
        const email = sanitize(data.email);
        const name = sanitize(data.name);
        
        // Validate email
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ 
            error: '⚠️ البريد الإلكتروني غير صحيح' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            data: { full_name: name },
            shouldCreateUser: true
          }
        });
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ 
          success: true,
          message: '✅ تم إرسال رمز التحقق إلى بريدك'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // ──────────────────────────────────────────────────────────────────
      // 🔑 AUTH: Verify OTP
      // ──────────────────────────────────────────────────────────────────
      case 'verify': {
        const email = sanitize(data.email);
        const token = sanitize(data.token);
        
        // Validate OTP format
        if (!/^\d{6}$/.test(token)) {
          return new Response(JSON.stringify({ 
            error: '⚠️ الرمز يجب أن يكون 6 أرقام' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Verify OTP
        const { data: session, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email'
        });
        
        if (error) {
          return new Response(JSON.stringify({ 
            error: '❌ رمز خاطئ أو منتهي الصلاحية' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          session: session.session,
          message: '✓ تم التحقق بنجاح'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // ──────────────────────────────────────────────────────────────────
      // 🚪 AUTH: Login with Password
      // ──────────────────────────────────────────────────────────────────
      case 'login': {
        const email = sanitize(data.email);
        const password = data.password; // Don't sanitize passwords
        
        // Validate
        if (!email || !password) {
          return new Response(JSON.stringify({ 
            error: '⚠️ أدخل البريد وكلمة المرور' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Login
        const { data: session, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) {
          return new Response(JSON.stringify({ 
            error: '❌ البريد أو كلمة المرور خاطئة' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          session,
          message: '✓ تم تسجيل الدخول'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // ──────────────────────────────────────────────────────────────────
      // 🤖 CHAT: AI Response (Claude)
      // ──────────────────────────────────────────────────────────────────
      case 'chat': {
        const question = sanitize(data.question);
        
        // Validate
        if (!question || question.length < 3) {
          return new Response(JSON.stringify({ 
            error: '⚠️ السؤال قصير جداً' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Call Claude API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `أنت خبير بالحوسبة الكمية في مختبر Iraq Quantum Lab. 
              
أجب بالعربي بشكل واضح ومختصر. إذا كان السؤال يحتاج كود Qiskit، أضفه.

السؤال: ${question}`
            }]
          })
        });
        
        if (!response.ok) {
          throw new Error('AI API failed');
        }
        
        const result = await response.json();
        const answer = result.content?.[0]?.text || 'لا يوجد رد';
        
        return new Response(JSON.stringify({ 
          success: true,
          answer
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // ──────────────────────────────────────────────────────────────────
      // 👑 ADMIN: Get Users List
      // ──────────────────────────────────────────────────────────────────
      case 'admin_users': {
        const token = data.token;
        
        if (!token) {
          return new Response(JSON.stringify({ 
            error: 'Unauthorized' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Verify user
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
          return new Response(JSON.stringify({ 
            error: 'Invalid token' 
          }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Check if admin
        if (user.email !== process.env.ADMIN_EMAIL) {
          return new Response(JSON.stringify({ 
            error: 'Access denied' 
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Get users (admin only)
        const adminClient = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY
        );
        
        const { data: users, error } = await adminClient.auth.admin.listUsers();
        
        if (error) throw error;
        
        return new Response(JSON.stringify({ 
          success: true,
          users: users.users || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // ──────────────────────────────────────────────────────────────────
      // ❓ Unknown Action
      // ──────────────────────────────────────────────────────────────────
      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action',
          available: ['signup', 'verify', 'login', 'chat', 'admin_users']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ⚙️ VERCEL CONFIG
// ══════════════════════════════════════════════════════════════════════════

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (closest to most users)
};

// ════════════════════════════════════════════════════════════════════════════
// 📚 USAGE EXAMPLES (Client Side)
// ════════════════════════════════════════════════════════════════════════════

/*

// ── Sign Up ──
const signup = await fetch('/api/secure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'signup',
    data: { email: 'user@example.com', name: 'John Doe' }
  })
});

// ── Verify OTP ──
const verify = await fetch('/api/secure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'verify',
    data: { email: 'user@example.com', token: '123456' }
  })
});

// ── Login ──
const login = await fetch('/api/secure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'login',
    data: { email: 'user@example.com', password: 'password123' }
  })
});

// ── Chat ──
const chat = await fetch('/api/secure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'chat',
    data: { question: 'ما هو Bell State؟' }
  })
});

// ── Admin ──
const users = await fetch('/api/secure', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'admin_users',
    data: { token: session.access_token }
  })
});

*/
