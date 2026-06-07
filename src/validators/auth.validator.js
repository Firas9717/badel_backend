const Joi = require('joi');

const registerSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'الاسم الأول ما يلزمش يكون فارغ.',
        'string.min': 'الاسم الأول لازم يكون فيه 2 حروف على الأقل.',
        'any.required': 'الاسم الأول ضروري.'
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
        'string.empty': 'اللقب ما يلزمش يكون فارغ.',
        'string.min': 'اللقب لازم يكون فيه 2 حروف على الأقل.',
        'any.required': 'اللقب ضروري.'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'الايميل مش صحيح.',
        'any.required': 'الايميل ضروري.'
    }),
    phone: Joi.string().pattern(/^[2345679]\d{7}$/).required().messages({
        'string.pattern.base': 'رقم الهاتف التونسي لازم يكون فيه 8 أرقام ويبدأ بـ 2, 3, 4, 5, 7 أو 9.',
        'any.required': 'رقم الهاتف ضروري.'
    }),
    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
        .required()
        .messages({
            'string.empty': 'المود باس ما تكونش فارغة.',
            'string.min': 'المود باس لازم تكون فيها 8 حروف على الأقل.',
            'string.max': 'المود باس طويلة برشا.',
            'string.pattern.base': 'المود باس لازم يكون فيها حرف كبير، حرف صغير ورقم.',
            'any.required': 'المود باس ضرورية.'
        }),
    passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
        'any.only': 'تأكيد المود باس مش مطابق.',
        'any.required': 'تأكيد المود باس ضروري.'
    })
});

const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'الايميل مش صحيح.',
        'any.required': 'الايميل ضروري.'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'المود باس ما يلزمش تكون فارغة.',
        'any.required': 'المود باس ضرورية.'
    })
});

module.exports = {
    registerSchema,
    loginSchema
};
