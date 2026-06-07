const logger = require('../utils/logger');
const multer = require('multer');

function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    // ── Gestion des erreurs Multer ──
    if (err instanceof multer.MulterError) {
        statusCode = 400;
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = "التصويرة كبيرة برشا! الحد الأقصى هو 5 ميغا.";
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = "ما تنجمش تبعث أكثر من 5 تصاور في المرة الواحدة.";
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = "فما مشكلة في الملفات اللي بعثتها، ثبت مليح.";
        } else {
            message = "فما مشكلة صارت وقت اللي كنت تطلع في التصاور.";
        }
    }

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = 'المورد مش موجود.';
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        const errors = Object.values(err.errors).map(e => e.message);
        message = errors.join(', ');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'التوكن مش صحيح.';
    }

    // Logging
    logger.error(`${message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`, {
        stack: err.stack,
        statusCode
    });

    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack || err);
    }

    const response = { 
        success: false, 
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };

    res.status(statusCode).json(response);
}

module.exports = errorHandler;
