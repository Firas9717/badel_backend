// ═══════════════════════════════════════════════════════
//  BADEL — Joi Validation Middleware (src/middleware/validate.js)
// ═══════════════════════════════════════════════════════

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, 
            stripUnknown: true, 
        });

        if (error) {
            // ✅ تجميع الأخطاء في مصفوفة نظيفة { field, message }
            const errors = error.details.map(d => ({
                field: d.path[0],
                message: d.message
            }));
            
            return res.status(400).json({
                success: false,
                message: 'فما أخطاء في البيانات اللي بعثتها.',
                errors // مصفوفة واضحة للفرونت آيند
            });
        }

        // تعويض req.body بالبيانات المنظمة والمنظفة (value)
        req.body = value;
        next();
    };
};

module.exports = validate;
