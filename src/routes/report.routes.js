const express = require('express');
const router = express.Router();

const { createReport, getMyReports } = require('../controllers/report.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, createReport);
router.get('/my', protect, getMyReports);

module.exports = router;
