const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Protection des routes ──
async function protect(req, res, next) {
  let token;

  // 1. Chercher d'abord dans l'entête Authorization (Bearer Token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Sinon, chercher dans les cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }


  if (!token) {
    return res.status(401).json({ success: false, message: 'Non autorisé : aucun jeton fourni.' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    // Vérifier si l'utilisateur est banni
    if (user.isBanned) {
      return res.status(403).json({ 
        success: false, 
        message: 'Votre compte est banni. Raison : ' + (user.banReason || 'Non spécifiée') 
      });
    }

    // Injecter l'utilisateur dans la requête
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: 'Non autorisé : jeton invalide ou expiré.',
      debug: err.message
    });
  }
}

// ── Accès restreint (Vérification Email) ──
async function restrictedAccess(req, res, next) {
  // Optionnel : Forcer la vérification d'email pour certaines actions
  next();
}

// ── Admin Access ──
async function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Accès refusé. Réservé aux administrateurs.' });
  }
}

module.exports = { protect, restrictedAccess, isAdmin };
