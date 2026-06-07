// ═══════════════════════════════════════════════════════
//  BADEL — Rate Limiters (src/middleware/rateLimiter.js)
// ═══════════════════════════════════════════════════════

const rateLimit = require('express-rate-limit');

// 1. Limiteur pour l'Authentification (Login/Register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 tentatives
    message: {
        success: false,
        message: "برشا محاولات. استنى 15 دقيقة وعاود."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 2. Limiteur Général pour l'API
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requêtes
    message: {
        success: false,
        message: "برشا طلبات. استنى شوية."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. Limiteur pour la Création d'Annonces
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 20, // 20 annonces max par heure
    message: {
        success: false,
        message: "وصلت للحد الأقصى. استنى ساعة."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. Limiteur pour les Messages (Anti-Spam)
const messageLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 messages par minute
    message: {
        success: false,
        message: "برشا رسائل في وقت قصير. استنى شوية."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    authLimiter,
    apiLimiter,
    createLimiter,
    messageLimiter
};
