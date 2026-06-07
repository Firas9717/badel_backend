const { body } = require('express-validator');

const governorates = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Beja', 'Jendouba', 'Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabes', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kebili'];

const updateProfileValidator = [
  body('firstName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('lastName').optional().isLength({ min: 2, max: 50 }).trim(),
  body('phone').optional().matches(/^[2345679]\d{7}$/).withMessage('Invalid Tunisian phone number'),
  body('bio').optional().isLength({ max: 500 }).withMessage('Bio max 500 characters'),
  body('location.governorate').optional().isIn(governorates),
  body('location.city').optional().trim(),
];

module.exports = { updateProfileValidator };
