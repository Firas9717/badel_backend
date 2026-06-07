const express = require('express');
const router = express.Router();
const { getAdminStats, trackEvent, getUsers, banUser, unbanUser, adminLogin } = require('../controllers/admin.controller');
const { protect, isAdmin } = require('../middleware/auth.middleware');

// Optional auth middleware: extracts user if token exists, otherwise continues as guest
const optionalAuth = (req, res, next) => {
    protect(req, res, (err) => {
        // Ignore error, just proceed (user will be undefined if not logged in)
        next();
    });
};

router.post('/login', adminLogin);

router.post('/track', optionalAuth, trackEvent);

// Protected Admin Routes
router.use(protect);
router.use(isAdmin);

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

module.exports = router;

