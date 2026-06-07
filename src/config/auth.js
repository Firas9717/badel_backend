// ═══════════════════════════════════════════════════════
//  BADEL — Auth Config (config/auth.js)
// ═══════════════════════════════════════════════════════

const cookieOptions = {
    httpOnly: true, // Bloque l'accès JS (Protection XSS)
    secure: process.env.NODE_ENV === 'production', // Uniquement en HTTPS en production
    sameSite: 'lax', // Équilibre entre sécurité et UX (Protection CSRF)
    path: '/', // Accessible sur tout le site
    maxAge: 365 * 24 * 60 * 60 * 1000 // 365 jours
};

module.exports = {
    cookieOptions
};
