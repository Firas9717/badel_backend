const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');

const passport = require('passport');

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Middleware to check if Google Auth is configured
const checkGoogleConfig = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:8080'}/login.html?error=Google login is not configured on the server yet.`);
  }
  next();
};

// Google OAuth Routes
router.get('/google', checkGoogleConfig, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', 
  checkGoogleConfig,
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:8080'}/login.html?error=google_auth_failed`, session: false }),
  (req, res) => {
    // This is called after successful authentication
    const { googleAuthCallback } = require('../controllers/auth.controller');
    googleAuthCallback(req, res);
  }
);

module.exports = router;
