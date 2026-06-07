const express = require('express');
const router = express.Router();
const { searchOffers, searchNearby, getCategoriesWithCount, getAutocompleteSuggestions, globalSearch } = require('../controllers/search.controller');

router.get('/', searchOffers);
router.get('/global', globalSearch);
router.get('/nearby', searchNearby);
router.get('/categories', getCategoriesWithCount);
router.get('/autocomplete', getAutocompleteSuggestions);

module.exports = router;
