const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false, // يرجع كل الأخطاء مش واحدة بركا
        stripUnknown: true, // يحي أي حاجة مش موجودة في الـ schema
    });

    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return res.status(400).json({
            success: false,
            message: errorMessage,
            details: error.details
        });
    }

    // تعويض الـ body بالـ value المنظمة
    req.body = value;
    next();
};

module.exports = { validate };
