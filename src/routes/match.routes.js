const express = require('express');
const router = express.Router();
const { getMatchesForOffer, getMyMatches, getMutualMatches } = require('../controllers/match.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/my', protect, getMyMatches);
router.get('/mutual', protect, getMutualMatches);
router.get('/offer/:offerId', protect, getMatchesForOffer);

module.exports = router;
