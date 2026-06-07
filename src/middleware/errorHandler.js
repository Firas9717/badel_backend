// ═══════════════════════════════════════════════════════
//  BADEL — Global Error Handler (src/middleware/errorHandler.js)
// ═══════════════════════════════════════════════════════

const multer = require('multer');
const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'فما مشكلة صارت في السيرفر.';
    let code = 'INTERNAL_SERVER_ERROR';

    // ── أخطاء Multer ──
    if (err instanceof multer.MulterError) {
        statusCode = 400;
        code = `MULTER_${err.code}`;
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                message = 'التصويرة كبيرة برشا! الحد الأقصى هو 5 ميغا.';
                break;
            case 'LIMIT_FILE_COUNT':
                message = 'ما تنجمش تبعث أكثر من 5 تصاور.';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'حقل التصاور مش صحيح (ثبت في اسم الحقل).';
                break;
            default:
                message = 'فما مشكلة صارت وقت رفع التصاور.';
        }
    }

    // ── أخطاء الفورما (من fileFilter) ──
    if (err.message && err.message.includes('الصور المسموح بيها')) {
        statusCode = 400;
        code = 'INVALID_FILE_TYPE';
    }

    // ── أخطاء Joi (إذا كانت موجودة كـ errors array) ──
    if (err.errors) {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }

    // ── تسجيل الأخطاء (Logging) ──
    if (statusCode === 500) {
        logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });
    } else {
        logger.warn(`${req.method} ${req.originalUrl} - ${message}`);
    }

    res.status(statusCode).json({
        success: false,
        message,
        code,
        errors: err.errors || undefined
    });
};

module.exports = errorHandler;
