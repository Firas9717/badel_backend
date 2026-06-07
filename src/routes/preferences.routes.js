const express = require('express');
const router = express.Router();
const {
  getAvailableCategories,
  saveInterests,
  getInterests,
  updateInterests
} = require('../controllers/preferences.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/categories', getAvailableCategories);
router.post('/interests', protect, saveInterests);
router.get('/interests', protect, getInterests);
router.put('/interests', protect, updateInterests);

module.exports = router;
