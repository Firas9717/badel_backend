const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');

const {
  getMyProfile,
  updateProfile,
  getUserProfile,
  updateLocation,
  getFavorites,
  deleteAccount,
} = require('../controllers/user.controller');

const { protect } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { updateProfileValidator } = require('../validators/user.validator');
const { parseMultipartJson } = require('../middleware/multipart.middleware');

// Middleware to handle express-validator results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join(', '), errors: errors.array() });
  }
  next();
};

router.get('/profile', protect, getMyProfile);
router.put('/profile', protect, upload.single('photo'), parseMultipartJson, updateProfileValidator, handleValidation, updateProfile);
router.get('/favorites', protect, getFavorites);
router.put('/update-location', protect, updateLocation);
router.delete('/account', protect, deleteAccount);
router.get('/:id', getUserProfile);

module.exports = router;
