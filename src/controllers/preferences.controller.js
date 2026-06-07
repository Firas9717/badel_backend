const User = require('../models/User');
const { ONBOARDING_CATEGORIES, VALID_CATEGORY_SLUGS } = require('../config/categories.config');

// @desc    Get all available onboarding categories
// @route   GET /api/preferences/categories
// @access  Public
exports.getAvailableCategories = async (req, res) => {
  try {
    const publicCategories = ONBOARDING_CATEGORIES.map(({ slug, label, icon, color }) => ({
      slug,
      label,
      icon,
      color
    }));
    return res.status(200).json({
      success: true,
      categories: publicCategories
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
};

// @desc    Save user interests
// @route   POST /api/preferences/interests
// @access  Private
exports.saveInterests = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner des catégories valides.'
      });
    }

    if (categories.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner au moins 3 catégories d\'intérêt.'
      });
    }

    // Validate slugs
    const invalidSlugs = categories.filter(c => !VALID_CATEGORY_SLUGS.includes(c));
    if (invalidSlugs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Certaines catégories sont invalides: ${invalidSlugs.join(', ')}`
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    user.interests = {
      categories,
      onboardingCompleted: true,
      updatedAt: new Date()
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Préférences enregistrées avec succès.',
      user: {
        id: user._id,
        firstName: user.firstName,
        interests: user.interests
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
};

// @desc    Get user interests
// @route   GET /api/preferences/interests
// @access  Private
exports.getInterests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('interests');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    return res.status(200).json({
      success: true,
      interests: user.interests || { categories: [], onboardingCompleted: false }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
};

// @desc    Update user interests
// @route   PUT /api/preferences/interests
// @access  Private
exports.updateInterests = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner des catégories valides.'
      });
    }

    if (categories.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez sélectionner au moins 3 catégories d\'intérêt.'
      });
    }

    // Validate slugs
    const invalidSlugs = categories.filter(c => !VALID_CATEGORY_SLUGS.includes(c));
    if (invalidSlugs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Certaines catégories sont invalides: ${invalidSlugs.join(', ')}`
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    user.interests = {
      categories,
      onboardingCompleted: true,
      updatedAt: new Date()
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Préférences mises à jour avec succès.',
      interests: user.interests
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  }
};
