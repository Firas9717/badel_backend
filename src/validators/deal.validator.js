const Joi = require('joi');

// Regex pour valider un MongoDB ObjectId
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createDealSchema = Joi.object({
    receiverOfferId: Joi.string().pattern(objectIdRegex).required().messages({
        'string.pattern.base': 'المعرف متاع العرض (ID) مش صحيح.',
        'any.required': 'المعرف متاع العرض ضروري.'
    }),
    offererOfferId: Joi.string().pattern(objectIdRegex).required().messages({
        'string.pattern.base': 'المعرف متاع العرض متاعك مش صحيح.',
        'any.required': 'لازم تختار شنوة باش تبدل.'
    }),
    message: Joi.string().max(500).allow('').optional().messages({
        'string.max': 'الميساج طويل برشا (500 حرف كحد أقصى).'
    })
});

const respondDealSchema = Joi.object({
    action: Joi.string().valid('accept', 'reject', 'counter').required().messages({
        'any.only': 'Action invalide. Valeurs acceptées: accept, reject, counter.',
        'any.required': 'Le champ action est requis.'
    }),
    counterOffer: Joi.object({
        message: Joi.string().max(500).allow('').optional(),
        newMoneyAmount: Joi.number().min(0).optional(),
        newOffererOffer: Joi.string().pattern(objectIdRegex).optional(),
        newReceiverOffer: Joi.string().pattern(objectIdRegex).optional()
    }).optional()
});

module.exports = {
    createDealSchema,
    respondDealSchema
};
