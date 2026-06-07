const express = require('express');
const router = express.Router();
const { proposeDeal, respondToDeal, getMyDeals, getDeal, cancelDeal } = require('../controllers/deal.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { createDealSchema, respondDealSchema } = require('../validators/deal.validator');

router.post('/', protect, validate(createDealSchema), proposeDeal);
router.get('/my', protect, getMyDeals);
router.get('/:id', protect, getDeal);
router.put('/:id/respond', protect, validate(respondDealSchema), respondToDeal);
router.put('/:id/cancel', protect, cancelDeal);

module.exports = router;
